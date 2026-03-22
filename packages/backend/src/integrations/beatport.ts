import type { RawTrack } from '@crate/shared';

const BEATPORT_API_BASE = 'https://api.beatport.com/v4';
const BEATPORT_DOCS_URL = `${BEATPORT_API_BASE}/docs/`;
const BEATPORT_TOKEN_URL = `${BEATPORT_API_BASE}/auth/o/token/`;
const BEATPORT_LOGIN_URL = `${BEATPORT_API_BASE}/auth/login/`;
const BEATPORT_AUTHORIZE_URL = `${BEATPORT_API_BASE}/auth/o/authorize/`;
const BEATPORT_POST_MESSAGE_URI = `${BEATPORT_API_BASE}/auth/o/post-message/`;

const USER_AGENT = 'Crate/1.0 (https://github.com/crate)';

// Regex patterns from the beets-beatport4 approach
const SCRIPT_SRC_PATTERN = /src=.([^ "'>]+js)/g;
const CLIENT_ID_PATTERN = /API_CLIENT_ID[:\s]*['"]([^'"]+)['"]/;

interface BeatportTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface BeatportTrack {
  id: number;
  name: string;
  mix_name: string;
  bpm: number;
  key: { camelot_number: number; camelot_letter: string; name: string } | null;
  genre: { id: number; name: string } | null;
  sub_genre: { id: number; name: string } | null;
  label: { id: number; name: string } | null;
  artists: { id: number; name: string }[];
  remixers: { id: number; name: string }[];
  release: { id: number; name: string } | null;
  publish_date: string;
  image: { uri: string } | null;
  preview: { mp3: { url: string } | null } | null;
  slug: string;
}

interface BeatportSearchResponse {
  results: BeatportTrack[];
  count: number;
  page: number;
  per_page: number;
}

export class BeatportClient {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private clientId: string | null = null;

  constructor(
    private username: string,
    private password: string,
    clientId?: string,
  ) {
    if (clientId) this.clientId = clientId;
  }

  // --- Client ID Scraping ---

  /**
   * Scrape the public client_id from Beatport's Swagger docs page.
   * The docs page loads JS bundles that contain the OAuth client_id
   * used by their own frontend — it's public and intended for browser use.
   */
  private async scrapeClientId(): Promise<string> {
    if (this.clientId) return this.clientId;

    console.log('[beatport] Scraping client_id from docs page...');

    const docsRes = await fetch(BEATPORT_DOCS_URL, {
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!docsRes.ok) {
      throw new Error(`Failed to fetch Beatport docs: ${docsRes.status}`);
    }

    const html = await docsRes.text();

    // Find all script src URLs
    const scriptUrls: string[] = [];
    let match;
    while ((match = SCRIPT_SRC_PATTERN.exec(html)) !== null) {
      let url = match[1];
      // Handle relative URLs
      if (url.startsWith('/')) {
        url = `https://api.beatport.com${url}`;
      } else if (!url.startsWith('http')) {
        url = `${BEATPORT_API_BASE}/${url}`;
      }
      scriptUrls.push(url);
    }

    // Fetch each script and search for client_id
    for (const scriptUrl of scriptUrls) {
      try {
        const scriptRes = await fetch(scriptUrl, {
          headers: { 'User-Agent': USER_AGENT },
        });
        if (!scriptRes.ok) continue;
        const scriptText = await scriptRes.text();
        const clientIdMatch = CLIENT_ID_PATTERN.exec(scriptText);
        if (clientIdMatch) {
          this.clientId = clientIdMatch[1];
          console.log(`[beatport] Found client_id: ${this.clientId.slice(0, 8)}...`);
          return this.clientId;
        }
      } catch {
        // Skip failed script fetches
      }
    }

    throw new Error('Could not extract client_id from Beatport docs page');
  }

  // --- Authentication (User Login + OAuth Code Flow) ---

  /** Validate credentials by running the full auth flow. Returns on success, throws on failure. */
  async testConnection(): Promise<void> {
    await this.authenticate();
  }

  private async authenticate(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60_000) {
      return this.accessToken;
    }

    const clientId = await this.scrapeClientId();

    // Step 1: Login with username/password to get a session
    console.log('[beatport] Logging in...');
    const loginRes = await fetch(BEATPORT_LOGIN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': USER_AGENT,
      },
      body: JSON.stringify({
        username: this.username,
        password: this.password,
      }),
      redirect: 'manual',
    });

    // Login returns cookies in a session — we need to capture them
    const cookies = loginRes.headers.getSetCookie?.() || [];
    const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');

    if (!loginRes.ok && loginRes.status !== 302) {
      const err = await loginRes.text().catch(() => 'unknown error');
      throw new Error(`Beatport login failed: ${loginRes.status} ${err}`);
    }

    // Step 2: Request authorization code (auto-approves after first auth)
    console.log('[beatport] Requesting authorization code...');
    const authParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId,
      redirect_uri: BEATPORT_POST_MESSAGE_URI,
    });

    const authRes = await fetch(`${BEATPORT_AUTHORIZE_URL}?${authParams}`, {
      headers: {
        'User-Agent': USER_AGENT,
        Cookie: cookieHeader,
      },
      redirect: 'manual',
    });

    // The code comes back in the Location header redirect (auto-approve)
    let code: string | null = null;
    const location = authRes.headers.get('location');
    if (location) {
      const codeMatch = /code=([^&]+)/.exec(location);
      if (codeMatch) code = codeMatch[1];

      // Check for OAuth error in redirect
      if (!code && location.includes('error=')) {
        const errMatch = /error=([^&]+)/.exec(location);
        throw new Error(`Beatport authorize error: ${errMatch?.[1] || 'unknown'}`);
      }
    }

    // First-time auth: Beatport shows a Django form requiring CSRF + "Authorize" submit
    if (!code && (authRes.status === 200 || authRes.status === 400)) {
      const authHtml = await authRes.text();
      const csrfMatch = /csrfmiddlewaretoken"\s+value="([^"]+)"/.exec(authHtml);

      if (csrfMatch) {
        console.log('[beatport] First-time auth — submitting authorize form...');
        const authPageCookies = authRes.headers.getSetCookie?.() || [];
        const allCookies = [...cookies, ...authPageCookies].map((c) => c.split(';')[0]).join('; ');

        const submitRes = await fetch(BEATPORT_AUTHORIZE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
            Cookie: allCookies,
            Referer: BEATPORT_AUTHORIZE_URL,
          },
          body: new URLSearchParams({
            csrfmiddlewaretoken: csrfMatch[1],
            redirect_uri: BEATPORT_POST_MESSAGE_URI,
            client_id: clientId,
            response_type: 'code',
            allow: 'Authorize',
          }),
          redirect: 'manual',
        });

        const submitLoc = submitRes.headers.get('location');
        if (submitLoc) {
          const m = /code=([^&]+)/.exec(submitLoc);
          if (m) code = m[1];
        }

        if (!code) {
          const submitBody = await submitRes.text();
          const m = /code=([^&"']+)/.exec(submitBody);
          if (m) code = m[1];
        }
      }
    }

    if (!code) {
      throw new Error(`Beatport authorization failed: no code received (status ${authRes.status})`);
    }

    // Step 3: Exchange authorization code for access token
    console.log('[beatport] Exchanging code for token...');
    const tokenParams = new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: BEATPORT_POST_MESSAGE_URI,
      client_id: clientId,
    });

    const tokenRes = await fetch(BEATPORT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': USER_AGENT,
      },
      body: tokenParams,
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text().catch(() => 'unknown error');
      throw new Error(`Beatport token exchange failed: ${tokenRes.status} ${err}`);
    }

    const tokenData = (await tokenRes.json()) as BeatportTokenResponse;
    this.accessToken = tokenData.access_token;
    this.tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;

    console.log(`[beatport] Authenticated successfully (token expires in ${tokenData.expires_in}s)`);
    return this.accessToken;
  }

  // --- API Methods ---

  private async apiFetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const token = await this.authenticate();
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await fetch(`${BEATPORT_API_BASE}${endpoint}${qs}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'User-Agent': USER_AGENT,
      },
    });

    if (res.status === 401) {
      // Token expired, clear and retry once
      this.accessToken = null;
      this.tokenExpiresAt = 0;
      const newToken = await this.authenticate();
      const retryRes = await fetch(`${BEATPORT_API_BASE}${endpoint}${qs}`, {
        headers: {
          Authorization: `Bearer ${newToken}`,
          'User-Agent': USER_AGENT,
        },
      });
      if (!retryRes.ok) {
        throw new Error(`Beatport API error: ${retryRes.status} ${await retryRes.text()}`);
      }
      return retryRes.json() as Promise<T>;
    }

    if (!res.ok) {
      throw new Error(`Beatport API error: ${res.status} ${await res.text()}`);
    }

    return res.json() as Promise<T>;
  }

  async searchTracks(params: {
    genreIds?: number[];
    bpmRange?: [number, number];
    key?: string;
    query?: string;
    perPage?: number;
  }): Promise<RawTrack[]> {
    const queryParams: Record<string, string> = {
      per_page: String(params.perPage || 50),
    };

    if (params.query) queryParams.q = params.query;
    if (params.genreIds?.length) queryParams.genre_id = params.genreIds.join(',');
    if (params.bpmRange) queryParams.bpm_range = `${params.bpmRange[0]},${params.bpmRange[1]}`;
    if (params.key) queryParams.key = params.key;

    const data = await this.apiFetch<BeatportSearchResponse>('/catalog/tracks/', queryParams);
    return data.results.map(normalizeBeatportTrack);
  }

  async searchCatalog(query: string, type: 'tracks' | 'releases' = 'tracks'): Promise<RawTrack[]> {
    const data = await this.apiFetch<{ tracks?: BeatportTrack[]; results?: BeatportTrack[] }>(
      '/catalog/search/',
      { q: query, type },
    );
    const tracks = data.tracks || data.results || [];
    return tracks.map(normalizeBeatportTrack);
  }

  async getTrackDetail(trackId: number): Promise<RawTrack> {
    const track = await this.apiFetch<BeatportTrack>(`/catalog/tracks/${trackId}/`);
    return normalizeBeatportTrack(track);
  }
}

function normalizeBeatportTrack(t: BeatportTrack): RawTrack {
  const camelotKey = t.key
    ? `${t.key.camelot_number}${t.key.camelot_letter}`
    : undefined;

  return {
    externalId: String(t.id),
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    remixer: t.remixers.length ? t.remixers.map((r) => r.name).join(', ') : undefined,
    label: t.label?.name,
    bpm: t.bpm || undefined,
    key: camelotKey,
    genre: t.genre?.name,
    subgenre: t.sub_genre?.name,
    sourceUrl: `https://www.beatport.com/track/${t.slug}/${t.id}`,
    sourcePlatform: 'beatport',
    artworkUrl: t.image?.uri,
    releaseDate: t.publish_date,
    previewUrl: t.preview?.mp3?.url,
    mixName: t.mix_name,
  };
}

// --- Singleton ---

let _beatportClient: BeatportClient | null = null;

export function getBeatportClient(): BeatportClient | null {
  if (!_beatportClient) {
    const username = process.env.BEATPORT_USERNAME;
    const password = process.env.BEATPORT_PASSWORD;
    if (!username || !password) return null;
    const clientId = process.env.BEATPORT_CLIENT_ID || undefined;
    _beatportClient = new BeatportClient(username, password, clientId);
  }
  return _beatportClient;
}

/** Initialize singleton from stored credentials (called after DB lookup in auth routes) */
export function initBeatportClient(username: string, password: string, clientId?: string): BeatportClient {
  _beatportClient = new BeatportClient(username, password, clientId);
  return _beatportClient;
}

/** Clear singleton (called on disconnect) */
export function resetBeatportClient(): void {
  _beatportClient = null;
}
