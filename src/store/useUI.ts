import { create } from 'zustand';

/** Ephemeral UI state (not persisted): which overlay is open, toasts. */

export type Overlay =
  | { type: 'compare'; ids?: [number, number] }
  | { type: 'jam' }
  | { type: 'shelves' }
  | { type: 'roulette'; pool: number[] }
  | { type: 'watch'; filmId: number }
  | { type: 'paywall'; filmId: number }
  | null;

export interface Toast {
  id: number;
  text: string;
  action?: { label: string; run: () => void };
}

interface UI {
  overlay: Overlay;
  open: (o: Overlay) => void;
  close: () => void;
  toasts: Toast[];
  toast: (text: string, action?: Toast['action']) => void;
  dismissToast: (id: number) => void;
}

let seq = 0;

export const useUI = create<UI>()((set) => ({
  overlay: null,
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
  toasts: [],
  toast: (text, action) =>
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id: ++seq, text, action }] })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = (text: string, action?: Toast['action']) => useUI.getState().toast(text, action);
