'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { usePlayerStore } from '@/stores/player.store';
import { api } from '@/lib/api-client';

let sdkScriptLoaded = false;

function loadSpotifySDK(): Promise<void> {
  if (sdkScriptLoaded || document.getElementById('spotify-sdk')) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = 'spotify-sdk';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;

    const prev = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      sdkScriptLoaded = true;
      prev?.();
      resolve();
    };

    document.head.appendChild(script);
  });
}

export function useSpotifySdk() {
  const playerRef = useRef<Spotify.Player | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const setError = usePlayerStore((s) => s.setError);

  // Initialize SDK + player
  useEffect(() => {
    let cancelled = false;

    async function init() {
      await loadSpotifySDK();
      if (cancelled || !window.Spotify) return;

      const player = new window.Spotify.Player({
        name: 'Crate',
        getOAuthToken: async (cb) => {
          try {
            const { accessToken } = await api.getSpotifyToken();
            cb(accessToken);
          } catch {
            console.warn('[SpotifySDK] Failed to get token');
          }
        },
        volume: usePlayerStore.getState().volume,
      });

      player.addListener('ready', ({ device_id }) => {
        console.log('[SpotifySDK] Ready, device_id:', device_id);
        setDeviceId(device_id);
        setSdkReady(true);
      });

      player.addListener('not_ready', () => {
        console.warn('[SpotifySDK] Device went offline');
        setDeviceId(null);
        setSdkReady(false);
      });

      player.addListener('player_state_changed', (state) => {
        if (!state) return;
        const store = usePlayerStore.getState();
        store.setCurrentTime(state.position / 1000);
        store.setDuration(state.duration / 1000);
        if (state.duration > 0) {
          store.setProgress(state.position / state.duration);
        }
        // Detect track ended or external pause
        if (state.paused && store.isPlaying) {
          // Track ended: position reset to 0
          if (state.position === 0) {
            store.pause();
          }
        }
      });

      player.addListener('initialization_error', ({ message }) => {
        console.error('[SpotifySDK] Init error:', message);
        setError('Spotify player failed to initialize');
      });

      player.addListener('authentication_error', ({ message }) => {
        console.error('[SpotifySDK] Auth error:', message);
        setError('Spotify auth failed — try reconnecting in Settings');
      });

      player.addListener('account_error', ({ message }) => {
        console.error('[SpotifySDK] Account error:', message);
        setError('Spotify Premium required for full playback');
      });

      player.addListener('playback_error', ({ message }) => {
        console.error('[SpotifySDK] Playback error:', message);
        setError('Spotify playback error');
      });

      player.connect();
      playerRef.current = player;
    }

    init();

    return () => {
      cancelled = true;
      if (pollRef.current) clearInterval(pollRef.current);
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, [setError]);

  // Progress polling (SDK doesn't fire continuous time updates)
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const state = await playerRef.current?.getCurrentState();
      if (!state) return;
      const store = usePlayerStore.getState();
      store.setCurrentTime(state.position / 1000);
      if (state.duration > 0) {
        store.setProgress(state.position / state.duration);
      }
    }, 500);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const playTrack = useCallback(
    async (spotifyTrackId: string) => {
      if (!deviceId) {
        setError('Spotify player not ready');
        return;
      }
      try {
        const { accessToken } = await api.getSpotifyToken();
        const res = await fetch(
          `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ uris: [`spotify:track:${spotifyTrackId}`] }),
          },
        );
        if (res.status === 403) {
          setError('Spotify Premium required for full playback');
          return;
        }
        if (!res.ok) {
          const err = await res.text();
          console.error('[SpotifySDK] Play failed:', res.status, err);
          setError('Failed to start Spotify playback');
          return;
        }
        startPolling();
      } catch (err: any) {
        console.error('[SpotifySDK] Play error:', err.message);
        setError('Failed to start Spotify playback');
      }
    },
    [deviceId, setError, startPolling],
  );

  const pause = useCallback(async () => {
    stopPolling();
    await playerRef.current?.pause();
  }, [stopPolling]);

  const resume = useCallback(async () => {
    await playerRef.current?.resume();
    startPolling();
  }, [startPolling]);

  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
    const state = await playerRef.current?.getCurrentState();
    if (state && !state.paused) {
      startPolling();
    } else {
      stopPolling();
    }
  }, [startPolling, stopPolling]);

  const seek = useCallback(async (fraction: number) => {
    const duration = usePlayerStore.getState().duration;
    if (duration > 0) {
      await playerRef.current?.seek(fraction * duration * 1000);
    }
  }, []);

  const setVolume = useCallback(async (vol: number) => {
    await playerRef.current?.setVolume(vol);
  }, []);

  return {
    sdkReady,
    deviceId,
    playTrack,
    togglePlay,
    pause,
    resume,
    seek,
    setVolume,
  };
}
