import crypto from 'crypto';
import type { RawTrack } from '@crate/shared';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';
const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SPOTIFY_TOKEN_URL = 'https://accounts.spotify.com/api/token';

const SCOPES = [
  'user-top-read',
  'user-read-recently-played',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  'streaming',
  'user-read-playback-state',
  'user-modify-playback-state',
];

// --- PKCE Helpers ---

export function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

// --- Spotify API Client ---

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  expires_in: number;
  refresh_token: string;
}

export class SpotifyClient {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
  ) {}

  buildAuthUrl(codeChallenge: string, state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      scope: SCOPES.join(' '),
      redirect_uri: this.redirectUri,
      state,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      show_dialog: 'true',
    });
    return `${SPOTIFY_AUTH_URL}?${params}`;
  }

  async exchangeCode(code: string, codeVerifier: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.redirectUri,
      client_id: this.clientId,
      code_verifier: codeVerifier,
    });

    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after') || '30';
      throw new Error(`Spotify rate limited — try again in ${retryAfter}s`);
    }

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Spotify token exchange failed: ${res.status} ${error}`);
    }

    const data = (await res.json()) as SpotifyTokenResponse;
    console.log(`[Spotify] Token granted scopes: ${data.scope}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  }> {
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.clientId,
    });

    const res = await fetch(SPOTIFY_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: body.toString(),
      signal: AbortSignal.timeout(15000),
    });

    if (res.status === 429) {
      const retryAfter = res.headers.get('retry-after') || '30';
      throw new Error(`Spotify rate limited — try again in ${retryAfter}s`);
    }

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Spotify token refresh failed: ${res.status} ${error}`);
    }

    const data = (await res.json()) as SpotifyTokenResponse;
    console.log(`[Spotify] Refreshed token scopes: ${data.scope}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  }

  // --- Data Fetching ---

  private async apiFetch<T>(endpoint: string, accessToken: string, retries = 3): Promise<T> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const res = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (res.status === 401) {
        throw new Error('SPOTIFY_TOKEN_EXPIRED');
      }

      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('retry-after') || '5', 10);
        // Cap wait at 30s — if Spotify says wait longer, just fail
        if (retryAfter > 30) {
          throw new Error(`Spotify rate limited (retry-after: ${retryAfter}s) — try again later`);
        }
        const waitMs = Math.min(retryAfter * 1000, 30000);
        if (attempt < retries) {
          console.warn(`[Spotify] Rate limited on ${endpoint}, waiting ${waitMs / 1000}s (attempt ${attempt + 1}/${retries})`);
          await new Promise(r => setTimeout(r, waitMs));
          continue;
        }
      }

      if (!res.ok) {
        const error = await res.text();
        throw new Error(`Spotify API error: ${res.status} ${error}`);
      }

      return res.json() as Promise<T>;
    }
    throw new Error('Spotify API: max retries exceeded');
  }

  async getTopTracks(accessToken: string, timeRange = 'medium_term', limit = 50) {
    return this.apiFetch<SpotifyTopTracksResponse>(
      `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
      accessToken,
    );
  }

  async getTopArtists(accessToken: string, timeRange = 'medium_term', limit = 50) {
    return this.apiFetch<SpotifyTopArtistsResponse>(
      `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
      accessToken,
    );
  }

  async getRecentlyPlayed(accessToken: string, limit = 50) {
    return this.apiFetch<SpotifyRecentlyPlayedResponse>(
      `/me/player/recently-played?limit=${limit}`,
      accessToken,
    );
  }

  async getCurrentUser(accessToken: string) {
    return this.apiFetch<SpotifyUser>('/me', accessToken);
  }

  async getRecommendations(
    accessToken: string,
    params: {
      seedGenres?: string[];
      seedArtists?: string[];
      seedTracks?: string[];
      minTempo?: number;
      maxTempo?: number;
      limit?: number;
    },
  ): Promise<{ tracks: SpotifyTrack[]; seeds: { id: string; type: string }[] }> {
    const qs = new URLSearchParams();
    if (params.seedGenres?.length) qs.set('seed_genres', params.seedGenres.slice(0, 5).join(','));
    if (params.seedArtists?.length) qs.set('seed_artists', params.seedArtists.slice(0, 5).join(','));
    if (params.seedTracks?.length) qs.set('seed_tracks', params.seedTracks.slice(0, 5).join(','));
    if (params.minTempo) qs.set('min_tempo', String(params.minTempo));
    if (params.maxTempo) qs.set('max_tempo', String(params.maxTempo));
    qs.set('limit', String(params.limit || 25));
    return this.apiFetch(`/recommendations?${qs.toString()}`, accessToken);
  }

  async getRecommendationsAsRawTracks(
    accessToken: string,
    params: {
      seedGenres?: string[];
      seedArtists?: string[];
      seedTracks?: string[];
      minTempo?: number;
      maxTempo?: number;
      limit?: number;
    },
  ): Promise<RawTrack[]> {
    const data = await this.getRecommendations(accessToken, params);
    return data.tracks.map(normalizeSpotifyTrack);
  }

  async getSavedTracks(accessToken: string, limit = 50, offset = 0) {
    return this.apiFetch<{ items: { track: SpotifyTrack }[]; total: number; next: string | null }>(
      `/me/tracks?limit=${limit}&offset=${offset}`,
      accessToken,
    );
  }

  async getAllSavedTrackIds(accessToken: string): Promise<{ externalId: string; title: string; artist: string }[]> {
    const results: { externalId: string; title: string; artist: string }[] = [];
    let offset = 0;
    const limit = 50;
    let total = Infinity;

    while (offset < total && offset < 5000) {
      const page = await this.getSavedTracks(accessToken, limit, offset);
      total = page.total;
      for (const item of page.items) {
        results.push({
          externalId: item.track.id,
          title: item.track.name,
          artist: item.track.artists.map(a => a.name).join(', '),
        });
      }
      offset += limit;
    }
    console.log(`[Spotify] Fetched ${results.length} saved tracks (of ${total} total)`);
    return results;
  }

  async getUserPlaylists(accessToken: string, limit = 50, offset = 0) {
    return this.apiFetch<{ items: { id: string; name: string; tracks: { total: number } }[]; total: number; next: string | null }>(
      `/me/playlists?limit=${limit}&offset=${offset}`,
      accessToken,
    );
  }

  /**
   * Fetch a full playlist object (includes up to 100 tracks embedded).
   * Uses GET /playlists/{id} instead of /playlists/{id}/tracks to avoid 403 in dev mode.
   * Response shape: { items: { items: [{ item: { id, name, artists } }], total } }
   */
  async getPlaylistFull(accessToken: string, playlistId: string) {
    return this.apiFetch<{
      id: string;
      name: string;
      items: {
        items: { item: { id: string; name: string; artists: { name: string }[] } | null }[];
        total: number;
        next: string | null;
      };
    }>(
      `/playlists/${playlistId}`,
      accessToken,
    );
  }

  async getAllPlaylistTrackIds(accessToken: string): Promise<{ externalId: string; title: string; artist: string }[]> {
    const results: { externalId: string; title: string; artist: string }[] = [];
    const seen = new Set<string>();

    // Get all user playlists (up to 200)
    let playlistOffset = 0;
    let playlistTotal = Infinity;
    const playlists: { id: string; name: string }[] = [];

    while (playlistOffset < playlistTotal && playlistOffset < 200) {
      const page = await this.getUserPlaylists(accessToken, 50, playlistOffset);
      playlistTotal = page.total;
      for (const p of page.items) {
        if (!p || !p.id) continue;
        playlists.push({ id: p.id, name: p.name });
      }
      playlistOffset += 50;
    }

    // Fetch tracks from each playlist using full playlist endpoint
    // GET /playlists/{id} returns tracks under .items.items[].item (not .tracks.items[].track)
    for (const playlist of playlists) {
      if (results.length >= 5000) break;

      try {
        const full = await this.getPlaylistFull(accessToken, playlist.id);
        const trackItems = full.items?.items;
        if (!trackItems) continue;

        let playlistCount = 0;
        for (const entry of trackItems) {
          const track = entry?.item;
          if (!track || !track.id) continue;
          if (seen.has(track.id)) continue;
          seen.add(track.id);
          results.push({
            externalId: track.id,
            title: track.name,
            artist: track.artists?.map(a => a.name).join(', ') ?? 'Unknown',
          });
          playlistCount++;
        }
        if (playlistCount > 0) {
          console.log(`[Spotify] Playlist "${playlist.name}": ${playlistCount} tracks`);
        }
      } catch (err: any) {
        console.warn(`[Spotify] Failed to fetch playlist "${playlist.name}": ${err.message}`);
      }
    }

    console.log(`[Spotify] Fetched ${results.length} playlist tracks from ${playlists.length} playlists`);
    return results;
  }

  async searchTracks(
    accessToken: string,
    params: { query: string; limit?: number },
  ): Promise<RawTrack[]> {
    const qs = new URLSearchParams({
      q: params.query,
      type: 'track',
      limit: String(Math.min(params.limit || 10, 10)),
    });
    const data = await this.apiFetch<{ tracks: { items: SpotifyTrack[] } }>(
      `/search?${qs.toString()}`,
      accessToken,
    );
    return data.tracks.items.map(normalizeSpotifyTrack);
  }
}

// --- Normalizer ---

function normalizeSpotifyTrack(t: SpotifyTrack): RawTrack {
  return {
    externalId: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    sourceUrl: t.external_urls.spotify,
    sourcePlatform: 'spotify',
    artworkUrl: t.album.images?.[0]?.url,
    previewUrl: t.preview_url || undefined,
  };
}

// --- Spotify API Response Types ---

interface SpotifyUser {
  id: string;
  display_name: string;
  email: string;
}

interface SpotifyTopTracksResponse {
  items: SpotifyTrack[];
  total: number;
}

interface SpotifyTopArtistsResponse {
  items: SpotifyArtist[];
  total: number;
}

interface SpotifyRecentlyPlayedResponse {
  items: { track: SpotifyTrack; played_at: string }[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { id: string; name: string }[];
  album: { id: string; name: string; images: { url: string }[] };
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  external_urls: { spotify: string };
}

interface SpotifyArtist {
  id: string;
  name: string;
  genres: string[];
  popularity: number;
}

// --- Singleton ---

let _spotifyClient: SpotifyClient | null = null;

export function getSpotifyClient(): SpotifyClient {
  if (!_spotifyClient) {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI || 'crate://auth/spotify/callback';

    if (!clientId || !clientSecret) {
      throw new Error('SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET must be set');
    }

    _spotifyClient = new SpotifyClient(clientId, clientSecret, redirectUri);
  }
  return _spotifyClient;
}
