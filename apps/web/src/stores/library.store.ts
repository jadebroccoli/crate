import { create } from 'zustand';
import type { Track, LibraryFilters, LibraryStats } from '@crate/shared';

interface LibraryStore {
  tracks: Track[];
  stats: LibraryStats | null;
  filters: LibraryFilters;
  setTracks: (tracks: Track[]) => void;
  setStats: (stats: LibraryStats) => void;
  setFilters: (filters: Partial<LibraryFilters>) => void;
}

export const useLibraryStore = create<LibraryStore>((set) => ({
  tracks: [],
  stats: null,
  filters: {},
  setTracks: (tracks) => set({ tracks }),
  setStats: (stats) => set({ stats }),
  setFilters: (filters) =>
    set((state) => ({ filters: { ...state.filters, ...filters } })),
}));
