import { create } from 'zustand';
import type { QueueItem } from '@crate/shared';

interface QueueStore {
  items: QueueItem[];
  setItems: (items: QueueItem[]) => void;
  updateItem: (id: string, updates: Partial<QueueItem>) => void;
  removeItem: (id: string) => void;
}

export const useQueueStore = create<QueueStore>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    })),
  removeItem: (id) =>
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    })),
}));
