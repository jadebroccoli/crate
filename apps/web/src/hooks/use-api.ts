'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { useQueueStore } from '@/stores/queue.store';
import { useLibraryStore } from '@/stores/library.store';
import { useTasteStore } from '@/stores/taste.store';
import type {
  RankedTrack,
  QueueItem,
  Track,
  TasteProfile,
  LibraryStats,
  LibraryFilters,
  DiscoveryFilters,
} from '@crate/shared';

// ── Query keys ──────────────────────────────────────────────

export const queryKeys = {
  discover: (filters?: DiscoveryFilters) => ['discover', filters] as const,
  queue: ['queue'] as const,
  libraryTracks: (filters?: LibraryFilters) => ['library', 'tracks', filters] as const,
  libraryStats: ['library', 'stats'] as const,
  tasteProfile: ['taste', 'profile'] as const,
};

// ── Discover ────────────────────────────────────────────────

export function useDiscoverFeed(filters?: DiscoveryFilters, enabled = true) {
  return useQuery({
    queryKey: queryKeys.discover(filters),
    queryFn: () => {
      const params: Record<string, string> = {};
      if (filters?.source && filters.source !== 'all') params.source = filters.source;
      if (filters?.bpmMin) params.bpmMin = String(filters.bpmMin);
      if (filters?.bpmMax) params.bpmMax = String(filters.bpmMax);
      if (filters?.genre) params.genre = filters.genre;
      if (filters?.stemsOnly) params.stemsOnly = 'true';
      return api.getDiscoverFeed(params) as Promise<{ tracks: RankedTrack[]; total: number }>;
    },
    enabled,
    retry: (count, error) => {
      // Don't retry 404 (no taste profile)
      if (error instanceof Error && error.message.includes('404')) return false;
      return count < 2;
    },
  });
}

export function useDismissTrack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { externalId: string; sourcePlatform: string }) =>
      api.dismissTrack(data),
    onMutate: async (dismissed) => {
      await qc.cancelQueries({ queryKey: ['discover'] });
      qc.setQueriesData({ queryKey: ['discover'] }, (old: any) => {
        if (!old?.tracks) return old;
        const tracks = old.tracks.filter(
          (t: RankedTrack) =>
            !(t.externalId === dismissed.externalId && t.sourcePlatform === dismissed.sourcePlatform),
        );
        return { ...old, tracks, total: tracks.length };
      });
    },
  });
}

// ── Queue ───────────────────────────────────────────────────

export function useQueue() {
  const setItems = useQueueStore((s) => s.setItems);
  return useQuery({
    queryKey: queryKeys.queue,
    queryFn: async () => {
      const data = (await api.getQueue()) as { items: QueueItem[]; total: number };
      setItems(data.items);
      return data;
    },
    refetchInterval: 10_000, // poll every 10s as SSE fallback
  });
}

export function useAddToQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      trackId?: string;
      title?: string;
      artist?: string;
      genre?: string;
      sourceUrl?: string;
      sourcePlatform?: string;
      bpm?: number;
      key?: string;
      artworkUrl?: string;
      wantFullTrack?: boolean;
      wantStemVocals?: boolean;
      wantStemInstrumental?: boolean;
      wantStemDrums?: boolean;
      wantStemBass?: boolean;
    }) => api.addToQueue(data as any),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.queue });
    },
  });
}

export function useRemoveFromQueue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.removeFromQueue(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.queue });
    },
  });
}

export function useRetryQueueItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.retryQueueItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.queue });
    },
  });
}

// ── Library ─────────────────────────────────────────────────

export function useLibraryTracks(filters?: LibraryFilters) {
  const setTracks = useLibraryStore((s) => s.setTracks);
  return useQuery({
    queryKey: queryKeys.libraryTracks(filters),
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters?.genre) params.genre = filters.genre;
      if (filters?.bpmMin) params.bpmMin = String(filters.bpmMin);
      if (filters?.bpmMax) params.bpmMax = String(filters.bpmMax);
      if (filters?.key) params.key = filters.key;
      if (filters?.mood) params.mood = filters.mood;
      if (filters?.hasStems) params.hasStems = 'true';
      if (filters?.page) params.page = String(filters.page);
      if (filters?.limit) params.limit = String(filters.limit);
      const data = (await api.getTracks(params)) as { tracks: Track[]; total: number };
      setTracks(data.tracks);
      return data;
    },
  });
}

export function useLibraryStats() {
  const setStats = useLibraryStore((s) => s.setStats);
  return useQuery({
    queryKey: queryKeys.libraryStats,
    queryFn: async () => {
      const data = (await api.getLibraryStats()) as LibraryStats;
      setStats(data);
      return data;
    },
  });
}

// ── Taste Profile ───────────────────────────────────────────

export function useTasteProfile() {
  const setProfile = useTasteStore((s) => s.setProfile);
  return useQuery({
    queryKey: queryKeys.tasteProfile,
    queryFn: async () => {
      const data = (await api.getTasteProfile()) as TasteProfile;
      setProfile(data);
      return data;
    },
    retry: (count, error) => {
      // Don't retry 404 (no profile yet)
      if (error instanceof Error && error.message.includes('404')) return false;
      return count < 2;
    },
  });
}

export function useSyncTaste() {
  const qc = useQueryClient();
  const setSyncing = useTasteStore((s) => s.setSyncing);
  return useMutation({
    mutationFn: async () => {
      setSyncing(true);
      return api.syncTaste() as Promise<TasteProfile>;
    },
    onSuccess: () => {
      qc.resetQueries({ queryKey: queryKeys.tasteProfile });
      qc.invalidateQueries({ queryKey: ['discover'] });
      setSyncing(false);
    },
    onError: () => {
      setSyncing(false);
    },
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<TasteProfile>) => api.updatePreferences(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tasteProfile });
    },
  });
}

// ── Spotify Auth ─────────────────────────────────────────────

export function useSpotifyStatus() {
  return useQuery({
    queryKey: ['auth', 'spotify', 'status'],
    queryFn: () => api.getSpotifyStatus(),
    staleTime: 30_000,
  });
}

export function useSpotifyLogin() {
  return useMutation({
    mutationFn: async () => {
      const { authUrl } = await api.getSpotifyLoginUrl();
      window.open(authUrl, '_blank', 'width=500,height=700');
    },
  });
}

export function useDisconnectSpotify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnectSpotify(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'spotify', 'status'] });
      qc.invalidateQueries({ queryKey: queryKeys.tasteProfile });
    },
  });
}

// ── Beatport Auth ─────────────────────────────────────────────

export function useBeatportStatus() {
  return useQuery({
    queryKey: ['auth', 'beatport', 'status'],
    queryFn: () => api.getBeatportStatus(),
    staleTime: 30_000,
  });
}

export function useBeatportLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { username: string; password: string }) => api.beatportLogin(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'beatport', 'status'] });
    },
  });
}

export function useDisconnectBeatport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnectBeatport(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'beatport', 'status'] });
    },
  });
}

// ── SoundCloud Auth ───────────────────────────────────────────

export function useSoundCloudStatus() {
  return useQuery({
    queryKey: ['auth', 'soundcloud', 'status'],
    queryFn: () => api.getSoundCloudStatus(),
    staleTime: 30_000,
  });
}

export function useSoundCloudConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { profileUrl: string }) => api.soundcloudConnect(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'soundcloud', 'status'] });
    },
  });
}

export function useDisconnectSoundCloud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.disconnectSoundCloud(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'soundcloud', 'status'] });
    },
  });
}
