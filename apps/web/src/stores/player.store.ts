import { create } from 'zustand';

export interface PlayerTrack {
  id: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  previewUrl?: string;
  sourcePlatform: string;
}

interface PlayerState {
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  volume: number;
  error: string | null;

  play: (track: PlayerTrack) => void;
  togglePlayPause: () => void;
  pause: () => void;
  resume: () => void;
  setProgress: (progress: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  setError: (error: string | null) => void;
  stop: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 0,
  currentTime: 0,
  volume: 0.8,
  error: null,

  play: (track) => set({ currentTrack: track, isPlaying: true, progress: 0, currentTime: 0, duration: 0, error: null }),
  togglePlayPause: () => set((s) => ({ isPlaying: !s.isPlaying })),
  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  setProgress: (progress) => set({ progress }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setVolume: (volume) => set({ volume }),
  setError: (error) => set(error ? { error, isPlaying: false } : { error: null }),
  stop: () => set({ currentTrack: null, isPlaying: false, progress: 0, currentTime: 0, duration: 0, error: null }),
}));
