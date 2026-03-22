import type { RawTrack } from '@crate/shared';
import { getSpotifyClient } from '../integrations/spotify.js';
import { getSoundCloudClientSync } from '../integrations/soundcloud.js';
import { getValidSpotifyToken } from './auth.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Light sync: top tracks + recently played = 3 API calls (runs every discover load)
const LIGHT_SYNC_TTL = 10 * 60 * 1000; // 10 minutes

function normalizeTrackKey(title: string, artist: string): string {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s*\((?:original mix|remix|edit|extended mix|radio edit|vip mix|bootleg|dub mix|club mix|instrumental)\)\s*/gi, '')
      .replace(/\s*\[(?:original mix|remix|edit|extended mix|radio edit|vip mix|bootleg|dub mix|club mix|instrumental)\]\s*/gi, '')
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  return `${clean(title)}|${clean(artist)}`;
}

class KnownTracksService {
  // In-memory cache loaded from DB for fast lookups
  private exactIds = new Set<string>();
  private fuzzyKeys = new Set<string>();
  private cacheLoaded = false;
  private lastLightSync = 0;
  private syncing: Promise<void> | null = null;

  /**
   * Load known tracks from DB into memory (fast, no API calls)
   */
  private async loadFromDb(): Promise<void> {
    const rows = await db.select({
      externalId: schema.knownTracks.externalId,
      sourcePlatform: schema.knownTracks.sourcePlatform,
      fuzzyKey: schema.knownTracks.fuzzyKey,
    }).from(schema.knownTracks);

    const exactIds = new Set<string>();
    const fuzzyKeys = new Set<string>();
    for (const row of rows) {
      exactIds.add(`${row.externalId}|${row.sourcePlatform}`);
      fuzzyKeys.add(row.fuzzyKey);
    }
    this.exactIds = exactIds;
    this.fuzzyKeys = fuzzyKeys;
    this.cacheLoaded = true;
    console.log(`[KnownTracks] Loaded ${exactIds.size} exact IDs, ${fuzzyKeys.size} fuzzy keys from DB`);
  }

  /**
   * Ensure in-memory cache is populated and do a light sync if stale.
   * Called on every discover load — only 3 Spotify API calls max.
   */
  async ensureSynced(): Promise<void> {
    if (!this.cacheLoaded) {
      await this.loadFromDb();
    }

    // Light sync: top tracks + recently played (3 API calls, runs every 10 min)
    if (Date.now() - this.lastLightSync < LIGHT_SYNC_TTL) return;
    if (this.syncing) return this.syncing;
    this.syncing = this._lightSync();
    try {
      await this.syncing;
    } finally {
      this.syncing = null;
    }
  }

  /**
   * Light sync — only top tracks + recently played (3 Spotify API calls).
   * Adds any new tracks to DB and refreshes in-memory cache.
   */
  private async _lightSync(): Promise<void> {
    try {
      const accessToken = await getValidSpotifyToken();
      const spotify = getSpotifyClient();

      const [topMedium, topShort, recent] = await Promise.all([
        spotify.getTopTracks(accessToken, 'medium_term', 50),
        spotify.getTopTracks(accessToken, 'short_term', 50),
        spotify.getRecentlyPlayed(accessToken, 50),
      ]);

      const newTracks: { externalId: string; sourcePlatform: string; title: string; artist: string; fuzzyKey: string; source: string }[] = [];

      for (const t of [...topMedium.items, ...topShort.items]) {
        const artist = t.artists.map(a => a.name).join(', ');
        const key = `${t.id}|spotify`;
        if (!this.exactIds.has(key)) {
          const fuzzyKey = normalizeTrackKey(t.name, artist);
          newTracks.push({ externalId: t.id, sourcePlatform: 'spotify', title: t.name, artist, fuzzyKey, source: 'top' });
          this.exactIds.add(key);
          this.fuzzyKeys.add(fuzzyKey);
        }
      }

      for (const item of recent.items) {
        const artist = item.track.artists.map(a => a.name).join(', ');
        const key = `${item.track.id}|spotify`;
        if (!this.exactIds.has(key)) {
          const fuzzyKey = normalizeTrackKey(item.track.name, artist);
          newTracks.push({ externalId: item.track.id, sourcePlatform: 'spotify', title: item.track.name, artist, fuzzyKey, source: 'recent' });
          this.exactIds.add(key);
          this.fuzzyKeys.add(fuzzyKey);
        }
      }

      // Batch insert new tracks to DB
      if (newTracks.length > 0) {
        await db.insert(schema.knownTracks).values(newTracks);
        console.log(`[KnownTracks] Light sync: added ${newTracks.length} new tracks`);
      } else {
        console.log('[KnownTracks] Light sync: no new tracks');
      }
    } catch (err: any) {
      console.warn('[KnownTracks] Light sync failed:', err.message);
    }

    this.lastLightSync = Date.now();
  }

  /**
   * Heavy sync — called once after Spotify connect or manually.
   * Fetches ALL saved tracks, top tracks, recently played, and playlists.
   * Persists everything to DB and rebuilds in-memory cache.
   */
  async heavySync(): Promise<void> {
    console.log('[KnownTracks] Starting heavy sync...');
    const allTracks: { externalId: string; sourcePlatform: string; title: string; artist: string; fuzzyKey: string; source: string }[] = [];

    // --- Spotify ---
    try {
      const accessToken = await getValidSpotifyToken();
      const spotify = getSpotifyClient();

      // Saved/liked tracks
      try {
        const saved = await spotify.getAllSavedTrackIds(accessToken);
        for (const t of saved) {
          allTracks.push({
            externalId: t.externalId, sourcePlatform: 'spotify',
            title: t.title, artist: t.artist,
            fuzzyKey: normalizeTrackKey(t.title, t.artist), source: 'saved',
          });
        }
        console.log(`[KnownTracks] Heavy sync: ${saved.length} Spotify saved tracks`);
      } catch (err: any) {
        console.warn('[KnownTracks] Heavy sync saved tracks failed:', err.message);
      }

      // Top tracks (medium + short term)
      try {
        const [topMedium, topShort] = await Promise.all([
          spotify.getTopTracks(accessToken, 'medium_term', 50),
          spotify.getTopTracks(accessToken, 'short_term', 50),
        ]);
        for (const t of [...topMedium.items, ...topShort.items]) {
          const artist = t.artists.map(a => a.name).join(', ');
          allTracks.push({
            externalId: t.id, sourcePlatform: 'spotify',
            title: t.name, artist,
            fuzzyKey: normalizeTrackKey(t.name, artist), source: 'top',
          });
        }
        console.log(`[KnownTracks] Heavy sync: ${topMedium.items.length + topShort.items.length} Spotify top tracks`);
      } catch (err: any) {
        console.warn('[KnownTracks] Heavy sync top tracks failed:', err.message);
      }

      // Recently played
      try {
        const recent = await spotify.getRecentlyPlayed(accessToken, 50);
        for (const item of recent.items) {
          const artist = item.track.artists.map(a => a.name).join(', ');
          allTracks.push({
            externalId: item.track.id, sourcePlatform: 'spotify',
            title: item.track.name, artist,
            fuzzyKey: normalizeTrackKey(item.track.name, artist), source: 'recent',
          });
        }
        console.log(`[KnownTracks] Heavy sync: ${recent.items.length} Spotify recently played`);
      } catch (err: any) {
        console.warn('[KnownTracks] Heavy sync recently played failed:', err.message);
      }

      // Playlist tracks (separate try/catch — needs playlist-read-private scope)
      try {
        const playlistTracks = await spotify.getAllPlaylistTrackIds(accessToken);
        for (const t of playlistTracks) {
          allTracks.push({
            externalId: t.externalId, sourcePlatform: 'spotify',
            title: t.title, artist: t.artist,
            fuzzyKey: normalizeTrackKey(t.title, t.artist), source: 'playlist',
          });
        }
        console.log(`[KnownTracks] Heavy sync: ${playlistTracks.length} Spotify playlist tracks`);
      } catch (err: any) {
        console.warn('[KnownTracks] Heavy sync playlists failed (reconnect Spotify for playlist scope):', err.message);
      }
    } catch (err: any) {
      console.warn('[KnownTracks] Heavy sync Spotify failed:', err.message);
    }

    // --- SoundCloud ---
    try {
      const session = await db.query.authSessions.findFirst({
        where: eq(schema.authSessions.id, 'soundcloud'),
      });
      if (session?.userId) {
        const sc = getSoundCloudClientSync();
        if (sc) {
          const likes = await sc.getUserLikes(parseInt(session.userId, 10), 200);
          for (const t of likes) {
            allTracks.push({
              externalId: t.externalId, sourcePlatform: 'soundcloud',
              title: t.title, artist: t.artist,
              fuzzyKey: normalizeTrackKey(t.title, t.artist), source: 'soundcloud_like',
            });
          }
          console.log(`[KnownTracks] Heavy sync: ${likes.length} SoundCloud liked tracks`);
        }
      }
    } catch (err: any) {
      console.warn('[KnownTracks] Heavy sync SoundCloud failed:', err.message);
    }

    // Deduplicate by externalId|platform before inserting
    const seen = new Set<string>();
    const deduped = allTracks.filter(t => {
      const key = `${t.externalId}|${t.sourcePlatform}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Replace all known tracks in DB (clear + insert in batches)
    await db.delete(schema.knownTracks);

    // SQLite has a variable limit, insert in batches of 100
    for (let i = 0; i < deduped.length; i += 100) {
      const batch = deduped.slice(i, i + 100);
      await db.insert(schema.knownTracks).values(batch);
    }

    console.log(`[KnownTracks] Heavy sync complete: ${deduped.length} unique tracks persisted to DB`);

    // Reload in-memory cache from DB
    await this.loadFromDb();
    this.lastLightSync = Date.now();
  }

  /**
   * Clear all known tracks for a specific platform (e.g., on disconnect)
   */
  async clearPlatform(platform: string): Promise<void> {
    await db.delete(schema.knownTracks).where(eq(schema.knownTracks.sourcePlatform, platform));
    // Reload cache
    this.cacheLoaded = false;
    await this.loadFromDb();
    console.log(`[KnownTracks] Cleared all ${platform} known tracks`);
  }

  isKnown(track: { externalId: string; sourcePlatform: string; title: string; artist: string }): boolean {
    // Exact match by platform ID
    if (this.exactIds.has(`${track.externalId}|${track.sourcePlatform}`)) return true;
    // Fuzzy match by normalized title + artist (cross-platform)
    if (this.fuzzyKeys.has(normalizeTrackKey(track.title, track.artist))) return true;
    return false;
  }

  filterUnknown(tracks: RawTrack[]): RawTrack[] {
    return tracks.filter((t) => !this.isKnown(t));
  }
}

// Singleton
export const knownTracks = new KnownTracksService();
