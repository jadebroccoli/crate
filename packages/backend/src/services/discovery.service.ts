import type { TasteProfile, RawTrack, RankedTrack, DiscoveryFilters } from '@crate/shared';
import { getBeatportClient } from '../integrations/beatport.js';
import { getSoundCloudClientSync as getSoundCloudClient } from '../integrations/soundcloud.js';
import { getSpotifyClient } from '../integrations/spotify.js';
import { getValidSpotifyToken } from './auth.service.js';
import { TrackRanker } from '../ai/track-ranker.js';
import { TasteService } from './taste.service.js';
import { db } from '../db/index.js';
import * as schema from '../db/schema.js';
import { knownTracks } from './known-tracks.service.js';

const trackRanker = new TrackRanker();
const tasteService = new TasteService();

// Simple in-memory cache for ranked results (30s TTL)
let rankCache: { data: RankedTrack[]; timestamp: number; key: string } | null = null;
const CACHE_TTL = 30_000;

export class DiscoveryService {
  async fetchCandidates(profile: TasteProfile, filters: DiscoveryFilters): Promise<RawTrack[]> {
    const candidates: RawTrack[] = [];
    const source = filters.source || 'all';

    // Build search params from taste profile + filters
    const bpmMin = filters.bpmMin ?? profile.bpmMin;
    const bpmMax = filters.bpmMax ?? profile.bpmMax;
    const genre = filters.genre;

    // Top genres from profile for search queries
    const topGenres = Object.entries(profile.genreBreakdown)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([g]) => g);

    const searchQuery = genre || topGenres[0] || 'DJ';

    const fetches: Promise<void>[] = [];

    // Beatport search
    if (source === 'all' || source === 'beatport') {
      const beatport = getBeatportClient();
      if (beatport) {
        fetches.push(
          beatport
            .searchTracks({
              query: searchQuery,
              bpmRange: bpmMin && bpmMax ? [bpmMin, bpmMax] : undefined,
              perPage: 25,
            })
            .then((tracks) => {
              candidates.push(...tracks);
            })
            .catch((err) => {
              console.error('Beatport search failed:', err.message);
            }),
        );
      }
    }

    // SoundCloud search
    if (source === 'all' || source === 'soundcloud') {
      const soundcloud = getSoundCloudClient();
      if (soundcloud) {
        // Search with multiple genre terms for variety
        const scQueries = topGenres.length > 0
          ? topGenres.slice(0, 2).map((g) => `${g} DJ`)
          : [searchQuery];

        for (const q of scQueries) {
          fetches.push(
            soundcloud
              .searchTracks({
                query: q,
                genre: genre,
                limit: 15,
              })
              .then((tracks) => {
                candidates.push(...tracks);
              })
              .catch((err) => {
                console.error('SoundCloud search failed:', err.message);
              }),
          );
        }
      }
    }

    // Spotify search (recommendations API was deprecated)
    if (source === 'all' || source === 'spotify') {
      fetches.push(
        (async () => {
          try {
            const accessToken = await getValidSpotifyToken();
            const spotify = getSpotifyClient();
            // Search using top genres as query terms
            const queries = topGenres.length > 0
              ? topGenres.slice(0, 2)
              : ['electronic'];

            for (const q of queries) {
              const tracks = await spotify.searchTracks(accessToken, { query: q, limit: 10 });
              candidates.push(...tracks);
            }
          } catch (err: any) {
            console.error('[Spotify] Search failed:', err.message);
          }
        })(),
      );
    }

    await Promise.all(fetches);

    // Deduplicate by title+artist (rough match)
    const seen = new Set<string>();
    return candidates.filter((track) => {
      const key = `${track.title.toLowerCase()}|${track.artist.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async rankWithAI(candidates: RawTrack[], profile: TasteProfile): Promise<RankedTrack[]> {
    if (candidates.length === 0) return [];

    // Batch to max 40 candidates to keep token usage reasonable
    const batch = candidates.slice(0, 40);
    return trackRanker.rank(batch, profile);
  }

  async getDiscoverFeed(filters: DiscoveryFilters): Promise<RankedTrack[]> {
    const profile = await tasteService.getProfile();
    if (!profile) {
      throw new Error('No taste profile found. Connect Spotify and sync first.');
    }

    // Check cache
    const cacheKey = JSON.stringify(filters);
    if (rankCache && rankCache.key === cacheKey && Date.now() - rankCache.timestamp < CACHE_TTL) {
      return rankCache.data;
    }

    const candidates = await this.fetchCandidates(profile, filters);
    if (candidates.length === 0) {
      return [];
    }

    // Filter out dismissed tracks
    const dismissed = await db.select({
      externalId: schema.dismissedTracks.externalId,
      sourcePlatform: schema.dismissedTracks.sourcePlatform,
    }).from(schema.dismissedTracks);
    const dismissedSet = new Set(dismissed.map(d => `${d.externalId}|${d.sourcePlatform}`));
    const filtered = candidates.filter(t => !dismissedSet.has(`${t.externalId}|${t.sourcePlatform}`));

    if (filtered.length === 0) {
      return [];
    }

    // Filter out tracks the user already knows (Spotify saved, SoundCloud likes)
    await knownTracks.ensureSynced();
    const fresh = knownTracks.filterUnknown(filtered);
    console.log(`[Discover] ${filtered.length} after dismiss → ${fresh.length} after known-tracks filter`);

    if (fresh.length === 0) {
      return [];
    }

    const ranked = await this.rankWithAI(fresh, profile);

    // Cache results
    rankCache = { data: ranked, timestamp: Date.now(), key: cacheKey };

    return ranked;
  }

  async searchCatalogs(query: string): Promise<RawTrack[]> {
    const results: RawTrack[] = [];
    const fetches: Promise<void>[] = [];

    const beatport = getBeatportClient();
    if (beatport) {
      fetches.push(
        beatport
          .searchTracks({ query, perPage: 20 })
          .then((tracks) => { results.push(...tracks); })
          .catch((err) => console.error('Beatport search failed:', err.message)),
      );
    }

    const soundcloud = getSoundCloudClient();
    if (soundcloud) {
      fetches.push(
        soundcloud
          .searchTracks({ query, limit: 20 })
          .then((tracks) => { results.push(...tracks); })
          .catch((err) => console.error('SoundCloud search failed:', err.message)),
      );
    }

    fetches.push(
      (async () => {
        try {
          const accessToken = await getValidSpotifyToken();
          const spotify = getSpotifyClient();
          const tracks = await spotify.searchTracks(accessToken, { query, limit: 10 });
          results.push(...tracks);
        } catch (err: any) {
          console.error('Spotify search failed:', err.message);
        }
      })(),
    );

    await Promise.all(fetches);
    return results;
  }
}
