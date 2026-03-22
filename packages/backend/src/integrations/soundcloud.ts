import type { RawTrack } from '@crate/shared';

const SOUNDCLOUD_API_BASE = 'https://api-v2.soundcloud.com';
const SOUNDCLOUD_WEB_URL = 'https://soundcloud.com';

// Regex to extract client_id from SoundCloud's JS bundles
const SCRIPT_SRC_PATTERN = /src="(https:\/\/a-v2\.sndcdn\.com\/assets\/[^"]+\.js)"/g;
const CLIENT_ID_PATTERN = /client_id:"([a-zA-Z0-9]+)"/;

interface SoundCloudTrack {
  id: number;
  title: string;
  user: { id: number; username: string; permalink: string; avatar_url: string | null };
  genre: string;
  tag_list: string;
  duration: number;
  bpm: number | null;
  permalink_url: string;
  artwork_url: string | null;
  created_at: string;
  downloadable: boolean;
  stream_url: string | null;
}

interface SoundCloudSearchResponse {
  collection: SoundCloudTrack[];
  total_results: number;
  next_href: string | null;
}

interface SoundCloudStreams {
  http_mp3_128_url?: string;
  hls_mp3_128_url?: string;
  hls_opus_64_url?: string;
}

interface SoundCloudUser {
  id: number;
  username: string;
  permalink: string;
  avatar_url: string | null;
  full_name: string;
}

export class SoundCloudClient {
  constructor(private clientId: string) {}

  /** Validate client_id by making a lightweight search call */
  async testConnection(): Promise<void> {
    await this.apiFetch<SoundCloudSearchResponse>('/search/tracks', { q: 'test', limit: '1' });
  }

  private async apiFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const allParams = { ...params, client_id: this.clientId };
    const qs = '?' + new URLSearchParams(allParams).toString();
    const res = await fetch(`${SOUNDCLOUD_API_BASE}${endpoint}${qs}`);

    if (!res.ok) {
      throw new Error(`SoundCloud API error: ${res.status} ${await res.text()}`);
    }

    return res.json() as Promise<T>;
  }

  async searchTracks(params: {
    query: string;
    genre?: string;
    limit?: number;
  }): Promise<RawTrack[]> {
    const queryParams: Record<string, string> = {
      q: params.query,
      limit: String(params.limit || 50),
    };
    if (params.genre) queryParams['filter.genre'] = params.genre;

    const data = await this.apiFetch<SoundCloudSearchResponse>('/search/tracks', queryParams);
    return data.collection.map(normalizeSoundCloudTrack);
  }

  async getStreamUrl(trackId: number): Promise<string | null> {
    try {
      const streams = await this.apiFetch<SoundCloudStreams>(`/tracks/${trackId}/streams`);
      return streams.http_mp3_128_url || streams.hls_mp3_128_url || null;
    } catch {
      return null;
    }
  }

  /** Resolve a SoundCloud profile URL to a user object */
  async resolveUser(profileUrl: string): Promise<SoundCloudUser> {
    const data = await this.apiFetch<SoundCloudUser>('/resolve', { url: profileUrl });
    return data;
  }

  /** Get a user's public likes */
  async getUserLikes(userId: number, limit = 50): Promise<RawTrack[]> {
    const data = await this.apiFetch<{ collection: { track: SoundCloudTrack }[] }>(
      `/users/${userId}/likes`,
      { limit: String(limit) },
    );
    return data.collection
      .filter((item) => item.track)
      .map((item) => normalizeSoundCloudTrack(item.track));
  }
}

function normalizeSoundCloudTrack(t: SoundCloudTrack): RawTrack {
  return {
    externalId: String(t.id),
    title: t.title,
    artist: t.user.username,
    bpm: t.bpm || undefined,
    genre: t.genre || undefined,
    sourceUrl: t.permalink_url,
    sourcePlatform: 'soundcloud',
    artworkUrl: t.artwork_url?.replace('-large', '-t500x500') || undefined,
    releaseDate: t.created_at,
  };
}

// --- Client ID Scraping ---

/**
 * Scrape the public client_id from SoundCloud's web app.
 * SoundCloud embeds it in their JS bundles — it's the same ID
 * used by the web player for all anonymous API calls.
 */
async function scrapeClientId(): Promise<string> {
  console.log('[soundcloud] Scraping client_id from web app...');

  const res = await fetch(SOUNDCLOUD_WEB_URL, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  if (!res.ok) throw new Error(`Failed to fetch SoundCloud: ${res.status}`);

  const html = await res.text();

  // Find script bundle URLs
  const scriptUrls: string[] = [];
  let match;
  while ((match = SCRIPT_SRC_PATTERN.exec(html)) !== null) {
    scriptUrls.push(match[1]);
  }

  // Search last few bundles first (client_id is usually in app bundles, not vendor)
  for (const url of scriptUrls.reverse().slice(0, 5)) {
    try {
      const scriptRes = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!scriptRes.ok) continue;
      const text = await scriptRes.text();
      const idMatch = CLIENT_ID_PATTERN.exec(text);
      if (idMatch) {
        console.log(`[soundcloud] Found client_id: ${idMatch[1].slice(0, 8)}...`);
        return idMatch[1];
      }
    } catch {
      // skip
    }
  }

  throw new Error('Could not scrape SoundCloud client_id');
}

// --- Singleton ---

let _soundcloudClient: SoundCloudClient | null = null;

export async function getSoundCloudClient(): Promise<SoundCloudClient | null> {
  if (!_soundcloudClient) {
    // Priority: env var → auto-scrape
    const envClientId = process.env.SOUNDCLOUD_CLIENT_ID;
    if (envClientId) {
      _soundcloudClient = new SoundCloudClient(envClientId);
    } else {
      try {
        const scrapedId = await scrapeClientId();
        _soundcloudClient = new SoundCloudClient(scrapedId);
      } catch (err) {
        console.error('[soundcloud] Failed to auto-initialize:', err);
        return null;
      }
    }
  }
  return _soundcloudClient;
}

/** Get the singleton synchronously (returns null if not yet initialized) */
export function getSoundCloudClientSync(): SoundCloudClient | null {
  return _soundcloudClient;
}

/** Initialize singleton from stored client_id */
export function initSoundCloudClient(clientId: string): SoundCloudClient {
  _soundcloudClient = new SoundCloudClient(clientId);
  return _soundcloudClient;
}

/** Clear singleton (called on disconnect) */
export function resetSoundCloudClient(): void {
  _soundcloudClient = null;
}
