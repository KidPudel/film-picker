import { create } from 'zustand';

/**
 * The projector is one continuous light behind the viewer's head.
 * Pages describe the scene; the renderer eases toward it.
 *
 *  catalog — no screen: the beam pours past you into the dark ahead and takes
 *            the colours of whichever film you point at.
 *  film    — the beam lands on the page's screen element (its DOM rect is the
 *            projection target), carrying the frame that is on screen.
 */
export interface Frame {
  /** URL of a small blurred frame the light is made of. Empty = the house reel (default cyan light). */
  image: string;
  /** Mean colour of that frame (hex), for spill on walls and seat rims. */
  mean: string;
}

export const HOUSE: Frame = { image: '', mean: '#a9c6d6' };

interface ProjectorState {
  mode: 'catalog' | 'film';
  frame: Frame;
  /** Temporary frame while a film is hovered / focused / centred in the list. */
  preview: Frame | null;
  /** Film-page screen element; the beam aims at its bounding rect. */
  screen: HTMLElement | null;
  /** The band where the row of seats in front of you is drawn (rendered by the projector). */
  seats: HTMLElement | null;
  warpAt: number;
  setMode: (mode: ProjectorState['mode']) => void;
  setFrame: (f: Frame) => void;
  setPreview: (f: Frame | null) => void;
  setScreen: (el: HTMLElement | null) => void;
  setSeats: (el: HTMLElement | null) => void;
  warp: () => void;
}

export const useProjector = create<ProjectorState>()((set) => ({
  mode: 'catalog',
  frame: HOUSE,
  preview: null,
  screen: null,
  seats: null,
  warpAt: -1e9,
  setMode: (mode) => set({ mode }),
  setFrame: (frame) => set({ frame }),
  setPreview: (preview) => set({ preview }),
  setScreen: (screen) => set({ screen }),
  setSeats: (seats) => set({ seats }),
  warp: () => set({ warpAt: performance.now() }),
}));
