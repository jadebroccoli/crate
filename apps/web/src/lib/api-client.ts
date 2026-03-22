const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4242';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {};
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Taste
  getTasteProfile: () => request('/api/taste/profile'),
  syncTaste: () => request('/api/taste/sync', { method: 'POST', body: '{}' }),
  updatePreferences: (data: unknown) =>
    request('/api/taste/preferences', { method: 'PUT', body: JSON.stringify(data) }),

  // Discover
  getDiscoverFeed: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/api/discover${qs}`);
  },
  searchDiscover: (query: string) =>
    request(`/api/discover/search?q=${encodeURIComponent(query)}`),
  dismissTrack: (data: { externalId: string; sourcePlatform: string }) =>
    request('/api/discover/dismiss', { method: 'POST', body: JSON.stringify(data) }),

  // Queue
  getQueue: () => request('/api/queue'),
  addToQueue: (data: { trackId: string; options: unknown }) =>
    request('/api/queue', { method: 'POST', body: JSON.stringify(data) }),
  removeFromQueue: (id: string) => request(`/api/queue/${id}`, { method: 'DELETE' }),
  retryQueueItem: (id: string) => request(`/api/queue/${id}/retry`, { method: 'POST' }),

  // Library
  getTracks: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    return request(`/api/library/tracks${qs}`);
  },
  getTrack: (id: string) => request(`/api/library/tracks/${id}`),
  removeTrack: (id: string) => request(`/api/library/tracks/${id}`, { method: 'DELETE' }),
  getLibraryStats: () => request('/api/library/stats'),
  getPlaylists: () => request('/api/library/playlists'),
  createPlaylist: (data: { name: string; description?: string }) =>
    request('/api/library/playlists', { method: 'POST', body: JSON.stringify(data) }),

  // Auth — Spotify
  getSpotifyLoginUrl: () => request<{ authUrl: string; state: string }>('/api/auth/spotify/login'),
  getSpotifyStatus: () =>
    request<{ connected: boolean; spotifyUserId?: string; displayName?: string; expiresAt?: string }>(
      '/api/auth/spotify/status',
    ),
  disconnectSpotify: () => request('/api/auth/spotify', { method: 'DELETE' }),

  // Auth — Beatport
  beatportLogin: (data: { username: string; password: string }) =>
    request<{ success: boolean; username: string }>('/api/auth/beatport/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getBeatportStatus: () =>
    request<{ connected: boolean; username?: string; displayName?: string }>(
      '/api/auth/beatport/status',
    ),
  disconnectBeatport: () => request('/api/auth/beatport', { method: 'DELETE' }),

  // Auth — SoundCloud
  soundcloudConnect: (data: { profileUrl: string }) =>
    request<{ success: boolean; username: string; userId: number }>('/api/auth/soundcloud/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSoundCloudStatus: () =>
    request<{ connected: boolean; username?: string; profileLinked?: boolean; searchAvailable?: boolean }>(
      '/api/auth/soundcloud/status',
    ),
  disconnectSoundCloud: () => request('/api/auth/soundcloud', { method: 'DELETE' }),

  // Stream
  getStreamUrl: (platform: string, trackId: string) =>
    request<{ streamUrl: string }>(`/api/stream/${platform}/${trackId}`),
  getSpotifyToken: () => request<{ accessToken: string }>('/api/stream/spotify/token'),
};
