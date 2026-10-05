import { create } from 'zustand';

/**
 * The projector is one continuous light that lives behind the whole app.
 * Pages describe the *scene* they want (where the booth is, where the beam
 * points, which film's colours it carries); the renderer eases toward it.
 */
export interface Scene {
  /** Source position, 0..1 of the viewport, y measured from the bottom. */
  src: [number, number];
  /** Beam direction in degrees (0 = right, 90 = up). */
  dir: number;
  /** Half-angle of the fan in degrees. */
  spread: number;
  intensity: number;
  /** Booth window + glare at the source (0..1). Off when the source is behind the viewer. */
  booth: number;
  /** 16 colours across the beam, left → right of the projected image. */
  palette: string[];
  /** How much scrolling dims the beam (0 = never, 1 = to almost nothing). */
  scrollDim: number;
}

export const DEFAULT_PALETTE = [
  '#3fc4dc', '#8ee8ff', '#ffffff', '#2aa7c4', '#b9f1ff', '#4f8dff', '#e8fbff', '#22d3c5',
  '#ffffff', '#6fd6ff', '#9ab8ff', '#d6f7ff', '#1fb2c9', '#ffffff', '#63e0e8', '#3a7cf0',
];

export const CATALOG_SCENE: Scene = {
  src: [0.36, 0.2],
  dir: 52,
  spread: 25,
  intensity: 1,
  booth: 1,
  palette: DEFAULT_PALETTE,
  scrollDim: 0.7,
};

export const CATALOG_SCENE_PHONE: Scene = {
  ...CATALOG_SCENE,
  src: [0.82, 0.16],
  dir: 104,
  spread: 17,
  intensity: 0.85,
};

interface ProjectorState {
  scene: Scene;
  /** Palette override while hovering a film (the projector "previews" it). */
  preview: string[] | null;
  warpAt: number;
  setScene: (s: Partial<Scene>) => void;
  setPreview: (p: string[] | null) => void;
  warp: () => void;
}

export const useProjector = create<ProjectorState>()((set) => ({
  scene: CATALOG_SCENE,
  preview: null,
  warpAt: -1e9,
  setScene: (s) => set((st) => ({ scene: { ...st.scene, ...s } })),
  setPreview: (preview) => set({ preview }),
  warp: () => set({ warpAt: performance.now() }),
}));
