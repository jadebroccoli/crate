'use client';

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/player.store';
import { api } from '@/lib/api-client';
import { useSpotifySdk } from './use-spotify-sdk';

let audioElement: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!audioElement) {
    audioElement = new Audio();
    audioElement.preload = 'auto';
    audioElement.crossOrigin = 'anonymous';
  }
  return audioElement;
}

export function useAudioPlayer() {
  const { currentTrack, isPlaying, volume } = usePlayerStore();
  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime);
  const setDuration = usePlayerStore((s) => s.setDuration);
  const setProgress = usePlayerStore((s) => s.setProgress);
  const pause = usePlayerStore((s) => s.pause);
  const setError = usePlayerStore((s) => s.setError);
  const lastTrackIdRef = useRef<string | null>(null);

  const spotifySdk = useSpotifySdk();
  const isSpotify = currentTrack?.sourcePlatform === 'spotify';

  // Load new track
  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.id === lastTrackIdRef.current) return;
    lastTrackIdRef.current = currentTrack.id;

    const audio = getAudio();
    setError(null);

    // Spotify tracks → use Web Playback SDK
    if (currentTrack.sourcePlatform === 'spotify') {
      // Stop HTMLAudioElement if it was playing something else
      audio.pause();
      audio.src = '';

      if (!spotifySdk.sdkReady) {
        setError('Spotify player loading…');
        return;
      }
      spotifySdk.playTrack(currentTrack.id);
      return;
    }

    // Non-Spotify tracks → stop Spotify SDK, use HTMLAudioElement
    spotifySdk.pause();

    async function loadAndPlay() {
      let url = currentTrack!.previewUrl;

      // SoundCloud: resolve stream URL via backend
      if (currentTrack!.sourcePlatform === 'soundcloud') {
        try {
          const res = await api.getStreamUrl('soundcloud', currentTrack!.id);
          url = res.streamUrl;
        } catch (err: any) {
          console.error('[Player] SoundCloud stream resolution failed:', err.message);
          if (!url) {
            setError('Could not load SoundCloud stream');
            return;
          }
        }
      }

      if (!url) {
        setError('No audio available for this track');
        console.warn('[Player] No playable URL for:', currentTrack!.title);
        return;
      }

      try {
        audio.src = url;
        audio.volume = usePlayerStore.getState().volume;
        await audio.play();
      } catch (err: any) {
        console.error('[Player] Playback failed:', err.message);
        setError('Playback failed');
      }
    }

    loadAndPlay();
  }, [currentTrack]);

  // Play/pause sync
  useEffect(() => {
    if (isSpotify) {
      // Delegate to Spotify SDK
      if (isPlaying) {
        spotifySdk.resume();
      } else {
        spotifySdk.pause();
      }
    } else {
      const audio = getAudio();
      if (isPlaying && audio.src) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    }
  }, [isPlaying]);

  // Volume sync
  useEffect(() => {
    getAudio().volume = volume;
    spotifySdk.setVolume(volume);
  }, [volume]);

  // Time update + error events (HTMLAudioElement only)
  useEffect(() => {
    const audio = getAudio();
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => pause();
    const onError = () => {
      const code = audio.error?.code;
      const msg = audio.error?.message || 'Unknown error';
      console.error('[Player] Audio error:', code, msg);
      setError('Audio failed to load');
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onError);
    };
  }, []);

  const seek = (fraction: number) => {
    if (isSpotify) {
      spotifySdk.seek(fraction);
      return;
    }
    const audio = getAudio();
    if (audio.duration) {
      audio.currentTime = fraction * audio.duration;
    }
  };

  return { seek };
}
