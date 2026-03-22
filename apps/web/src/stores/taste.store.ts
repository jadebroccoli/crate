import { create } from 'zustand';
import type { TasteProfile } from '@crate/shared';

interface TasteStore {
  profile: TasteProfile | null;
  isSyncing: boolean;
  setProfile: (profile: TasteProfile | null) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useTasteStore = create<TasteStore>((set) => ({
  profile: null,
  isSyncing: false,
  setProfile: (profile) => set({ profile }),
  setSyncing: (isSyncing) => set({ isSyncing }),
}));
