import { create } from "zustand";

/**
 * App-wide selection + trip-chain store.
 *
 * Keyed on destination `id` (NOT `parkCode` — see outbound-p1-mvp B1). A
 * destination `id` is the unique key used everywhere downstream (map
 * markers, drive-matrix nodes, trip chain). Some destinations share a
 * `parkCode` for NPS-content joins (e.g. Sequoia `id: "seki"` and Kings
 * Canyon `id: "seki-kica"` both carry `parkCode: "seki"`) but every `id`
 * in this store is unique.
 */

export interface OutboundState {
  /** The currently selected destination id, or null if nothing is selected. */
  selectedId: string | null;
  /** The destination id currently hovered (e.g. map marker hover), or null. */
  hoveredId: string | null;
  /** Ordered list of destination ids forming the trip chain (FoCo implicit at both ends). */
  tripChain: string[];

  /** Set the selected destination id (or clear with null). */
  setSelected: (id: string | null) => void;
  /** Set the hovered destination id (or clear with null). */
  setHovered: (id: string | null) => void;
  /** Append a destination id to the end of the trip chain. No-op if already present. */
  addPark: (id: string) => void;
  /** Remove a destination id from the trip chain. */
  removePark: (id: string) => void;
  /** Replace the trip chain with a new ordering (e.g. after drag-and-drop reorder). */
  reorderTrip: (chain: string[]) => void;
  /** Empty the trip chain. */
  clearTrip: () => void;
}

export const useOutboundStore = create<OutboundState>((set) => ({
  selectedId: null,
  hoveredId: null,
  tripChain: [],

  setSelected: (id) => set({ selectedId: id }),
  setHovered: (id) => set({ hoveredId: id }),
  addPark: (id) =>
    set((state) =>
      state.tripChain.includes(id)
        ? state
        : { tripChain: [...state.tripChain, id] },
    ),
  removePark: (id) =>
    set((state) => ({
      tripChain: state.tripChain.filter((chainId) => chainId !== id),
    })),
  reorderTrip: (chain) => set({ tripChain: chain }),
  clearTrip: () => set({ tripChain: [] }),
}));
