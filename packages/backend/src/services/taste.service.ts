import type { TasteProfile, RawListeningData, SpotifyTrackItem, SpotifyArtistItem } from '@crate/shared';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { getSpotifyClient } from '../integrations/spotify.js';
import { getValidSpotifyToken } from './auth.service.js';
import { TasteProfiler } from '../ai/taste-profiler.js';

const tasteProfiler = new TasteProfiler();

export class TasteService {
  async fetchSpotifyListeningData(): Promise<RawListeningData> {
    const accessToken = await getValidSpotifyToken();
    const spotify = getSpotifyClient();

    // Fetch all three data sources in parallel
    const [topTracksRes, topArtistsRes, recentRes] = await Promise.all([
      spotify.getTopTracks(accessToken, 'medium_term', 50),
      spotify.getTopArtists(accessToken, 'medium_term', 50),
      spotify.getRecentlyPlayed(accessToken, 50),
    ]);

    const topTracks: SpotifyTrackItem[] = topTracksRes.items.map((t) => ({
      id: t.id,
      name: t.name,
      artists: t.artists.map((a) => ({ id: a.id, name: a.name })),
      album: { id: t.album.id, name: t.album.name },
      durationMs: t.duration_ms,
      popularity: t.popularity,
    }));

    const topArtists: SpotifyArtistItem[] = topArtistsRes.items.map((a) => ({
      id: a.id,
      name: a.name,
      genres: a.genres,
      popularity: a.popularity,
    }));

    const recentlyPlayed: SpotifyTrackItem[] = recentRes.items.map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artists: item.track.artists.map((a) => ({ id: a.id, name: a.name })),
      album: { id: item.track.album.id, name: item.track.album.name },
      durationMs: item.track.duration_ms,
      popularity: item.track.popularity,
    }));

    return { topTracks, topArtists, recentlyPlayed };
  }

  async synthesizeProfile(rawData: RawListeningData): Promise<TasteProfile> {
    const synthesized = await tasteProfiler.synthesize(rawData);

    // Get Spotify user ID from session
    const session = await db.query.authSessions.findFirst({
      where: eq(schema.authSessions.id, 'spotify'),
    });

    return {
      id: 'singleton',
      spotifyUserId: session?.spotifyUserId ?? undefined,
      rawListeningData: JSON.stringify(rawData),
      genreBreakdown: synthesized.genreBreakdown,
      bpmMin: synthesized.bpmMin,
      bpmMax: synthesized.bpmMax,
      preferredKeys: synthesized.preferredKeys,
      energyPreference: synthesized.energyPreference,
      stemPreferences: synthesized.stemPreferences,
      editPreferences: synthesized.editPreferences,
      aiSummary: synthesized.aiSummary,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };
  }

  async syncProfile(): Promise<TasteProfile> {
    const rawData = await this.fetchSpotifyListeningData();
    const profile = await this.synthesizeProfile(rawData);
    await this.saveProfile(profile);
    return profile;
  }

  async saveProfile(profile: TasteProfile): Promise<void> {
    await db.insert(schema.tasteProfile).values({
      id: 'singleton',
      spotifyUserId: profile.spotifyUserId,
      rawListeningData: profile.rawListeningData,
      genreBreakdown: JSON.stringify(profile.genreBreakdown),
      bpmMin: profile.bpmMin,
      bpmMax: profile.bpmMax,
      preferredKeys: JSON.stringify(profile.preferredKeys),
      energyPreference: profile.energyPreference,
      stemPreferences: JSON.stringify(profile.stemPreferences),
      editPreferences: JSON.stringify(profile.editPreferences),
      aiSummary: profile.aiSummary,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: schema.tasteProfile.id,
      set: {
        spotifyUserId: profile.spotifyUserId,
        rawListeningData: profile.rawListeningData,
        genreBreakdown: JSON.stringify(profile.genreBreakdown),
        bpmMin: profile.bpmMin,
        bpmMax: profile.bpmMax,
        preferredKeys: JSON.stringify(profile.preferredKeys),
        energyPreference: profile.energyPreference,
        stemPreferences: JSON.stringify(profile.stemPreferences),
        editPreferences: JSON.stringify(profile.editPreferences),
        aiSummary: profile.aiSummary,
        lastSyncedAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getProfile(): Promise<TasteProfile | null> {
    const row = await db.query.tasteProfile.findFirst({
      where: eq(schema.tasteProfile.id, 'singleton'),
    });
    if (!row) return null;

    return {
      id: row.id,
      spotifyUserId: row.spotifyUserId ?? undefined,
      rawListeningData: row.rawListeningData ?? undefined,
      genreBreakdown: row.genreBreakdown ? JSON.parse(row.genreBreakdown) : {},
      bpmMin: row.bpmMin ?? undefined,
      bpmMax: row.bpmMax ?? undefined,
      preferredKeys: row.preferredKeys ? JSON.parse(row.preferredKeys) : [],
      energyPreference: row.energyPreference ?? undefined,
      stemPreferences: row.stemPreferences ? JSON.parse(row.stemPreferences) : [],
      editPreferences: row.editPreferences ? JSON.parse(row.editPreferences) : [],
      aiSummary: row.aiSummary ?? undefined,
      lastSyncedAt: row.lastSyncedAt ?? undefined,
      updatedAt: row.updatedAt ?? undefined,
    };
  }

  async updatePreferences(updates: Partial<TasteProfile>): Promise<TasteProfile | null> {
    const existing = await this.getProfile();
    if (!existing) {
      throw new Error('No taste profile exists. Sync with Spotify first.');
    }

    const merged = { ...existing, ...updates, updatedAt: new Date() };
    await this.saveProfile(merged);
    return this.getProfile();
  }
}
