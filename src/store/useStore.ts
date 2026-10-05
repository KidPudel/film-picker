import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import type { ExperienceKey } from '../data/types';
import type { CompanyValue, EnergyValue, SpoilerLevel, TimeValue } from '../data/vocab';
import { eveningKey } from '../lib/format';

// ─── Types ────────────────────────────────────────────────────────────────

export type Exclusion =
  | { kind: 'genre'; value: string; label: string }
  | { kind: 'bw'; label: string }
  | { kind: 'subs'; label: string }
  | { kind: 'heavy'; label: string };

export interface Tonight {
  time: TimeValue | null;
  energy: EnergyValue | null;
  wants: ExperienceKey[];
  company: CompanyValue | null;
  noExtraCost: boolean;
  /** Tonight-only exclusions understood from free text («но не комедию»). */
  excludes: Exclusion[];
}

/** Lasting "less of this" preferences from the «Не то» menu. */
export type Dislike =
  | { kind: 'director'; value: string }
  | { kind: 'actor'; value: string }
  | { kind: 'genre'; value: string }
  | { kind: 'bw' }
  | { kind: 'subs' };

export type Dismissal =
  | { kind: 'tonight'; evening: string }
  | { kind: 'never'; reason: string; at: number };

export interface ShelfItem {
  filmId: number;
  reason?: string;
  at: number;
}
export interface Shelf {
  id: string;
  name: string;
  items: ShelfItem[];
}

export type Vote = 'yes' | 'maybe' | 'no';
export interface Jam {
  code: string;
  partnerJoined: boolean;
  votes: Record<number, Vote>;
  veto: number | null;
}

export interface Prefs {
  motion: 'system' | 'reduce';
  text: 'normal' | 'large';
  contrast: 'normal' | 'more';
  theme: 'dark' | 'light';
}

export const MAX_TICKETS = 3;
export const SOMEDAY = 'someday';

export const EMPTY_TONIGHT: Tonight = {
  time: null,
  energy: null,
  wants: [],
  company: null,
  noExtraCost: false,
  excludes: [],
};

interface State {
  tonight: Tonight;
  tickets: number[];
  shelves: Shelf[];
  dismissed: Record<number, Dismissal>;
  seen: number[];
  dislikes: Dislike[];
  reminders: number[];
  spoiler: SpoilerLevel;
  prefs: Prefs;
  view: 'cases' | 'spines';
  sort: 'fit' | 'runtime' | 'rating';
  jam: Jam | null;

  setTonight: (patch: Partial<Tonight>) => void;
  resetTonight: () => void;
  toggleTicket: (id: number) => 'added' | 'removed' | 'full';
  removeTicket: (id: number) => void;
  saveToShelf: (filmId: number, shelfId: string, reason?: string) => void;
  createShelf: (name: string) => string;
  removeFromShelf: (filmId: number, shelfId: string) => void;
  renameShelf: (shelfId: string, name: string) => void;
  deleteShelf: (shelfId: string) => void;
  dismiss: (id: number, d: Dismissal) => void;
  undismiss: (id: number) => void;
  toggleSeen: (id: number) => void;
  addDislike: (d: Dislike) => void;
  removeDislike: (d: Dislike) => void;
  toggleReminder: (id: number) => void;
  setSpoiler: (s: SpoilerLevel) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setView: (v: State['view']) => void;
  setSort: (s: State['sort']) => void;
  startJam: () => void;
  updateJam: (patch: Partial<Jam>) => void;
  endJam: () => void;
  resetAll: () => void;
}

const sameDislike = (a: Dislike, b: Dislike) =>
  a.kind === b.kind && ('value' in a ? a.value === (b as typeof a).value : true);

/** localStorage that never throws (private mode, blocked storage, previews). */
const safeStorage: StateStorage = {
  getItem: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  setItem: (k, v) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* storage unavailable — state simply won't persist */
    }
  },
  removeItem: (k) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* noop */
    }
  },
};

const initial = {
  tonight: EMPTY_TONIGHT,
  tickets: [] as number[],
  shelves: [{ id: SOMEDAY, name: 'Когда-нибудь', items: [] }] as Shelf[],
  dismissed: {} as Record<number, Dismissal>,
  seen: [] as number[],
  dislikes: [] as Dislike[],
  reminders: [] as number[],
  spoiler: 1 as SpoilerLevel,
  prefs: { motion: 'system', text: 'normal', contrast: 'normal', theme: 'dark' } as Prefs,
  view: 'cases' as const,
  sort: 'fit' as const,
  jam: null as Jam | null,
};

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...initial,

      setTonight: (patch) => set((s) => ({ tonight: { ...s.tonight, ...patch } })),
      resetTonight: () => set({ tonight: EMPTY_TONIGHT }),

      toggleTicket: (id) => {
        const { tickets } = get();
        if (tickets.includes(id)) {
          set({ tickets: tickets.filter((t) => t !== id) });
          return 'removed';
        }
        if (tickets.length >= MAX_TICKETS) return 'full';
        set({ tickets: [...tickets, id] });
        return 'added';
      },
      removeTicket: (id) => set((s) => ({ tickets: s.tickets.filter((t) => t !== id) })),

      saveToShelf: (filmId, shelfId, reason) =>
        set((s) => ({
          shelves: s.shelves.map((sh) =>
            sh.id === shelfId
              ? { ...sh, items: [...sh.items.filter((i) => i.filmId !== filmId), { filmId, reason, at: Date.now() }] }
              : sh,
          ),
        })),
      createShelf: (name) => {
        const id = `shelf-${Date.now().toString(36)}`;
        set((s) => ({ shelves: [...s.shelves, { id, name, items: [] }] }));
        return id;
      },
      removeFromShelf: (filmId, shelfId) =>
        set((s) => ({
          shelves: s.shelves.map((sh) =>
            sh.id === shelfId ? { ...sh, items: sh.items.filter((i) => i.filmId !== filmId) } : sh,
          ),
        })),
      renameShelf: (shelfId, name) =>
        set((s) => ({ shelves: s.shelves.map((sh) => (sh.id === shelfId ? { ...sh, name } : sh)) })),
      deleteShelf: (shelfId) =>
        set((s) => ({ shelves: s.shelves.filter((sh) => sh.id !== shelfId || sh.id === SOMEDAY) })),

      dismiss: (id, d) =>
        set((s) => ({ dismissed: { ...s.dismissed, [id]: d }, tickets: s.tickets.filter((t) => t !== id) })),
      undismiss: (id) =>
        set((s) => {
          const next = { ...s.dismissed };
          delete next[id];
          return { dismissed: next };
        }),
      toggleSeen: (id) =>
        set((s) => ({ seen: s.seen.includes(id) ? s.seen.filter((x) => x !== id) : [...s.seen, id] })),
      addDislike: (d) =>
        set((s) => (s.dislikes.some((x) => sameDislike(x, d)) ? s : { dislikes: [...s.dislikes, d] })),
      removeDislike: (d) => set((s) => ({ dislikes: s.dislikes.filter((x) => !sameDislike(x, d)) })),
      toggleReminder: (id) =>
        set((s) => ({
          reminders: s.reminders.includes(id) ? s.reminders.filter((x) => x !== id) : [...s.reminders, id],
        })),
      setSpoiler: (spoiler) => set({ spoiler }),
      setPrefs: (p) => set((s) => ({ prefs: { ...s.prefs, ...p } })),
      setView: (view) => set({ view }),
      setSort: (sort) => set({ sort }),

      startJam: () =>
        set({
          jam: {
            code: `КИНО-${Math.floor(1000 + Math.random() * 9000)}`,
            partnerJoined: false,
            votes: {},
            veto: null,
          },
        }),
      updateJam: (patch) => set((s) => (s.jam ? { jam: { ...s.jam, ...patch } } : s)),
      endJam: () => set({ jam: null }),
      resetAll: () => set({ ...initial }),
    }),
    {
      name: 'kino-na-vecher:v1',
      storage: createJSONStorage(() => safeStorage),
      version: 1,
      // Tonight-only dismissals expire at 5:00 the next morning.
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const today = eveningKey();
        const fresh = Object.fromEntries(
          Object.entries(state.dismissed).filter(([, d]) => d.kind !== 'tonight' || d.evening === today),
        );
        state.dismissed = fresh as Record<number, Dismissal>;
      },
    },
  ),
);

export const isOnShelf = (shelves: Shelf[], filmId: number) =>
  shelves.some((s) => s.items.some((i) => i.filmId === filmId));
