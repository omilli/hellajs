import { ReactiveState } from "./reactive.types";

export const HELLA_REACTIVE: ReactiveState = {
  batchingSignals: false,
  activeEffects: [],
  pendingEffects: new Set(),
  disposedEffects: new WeakSet(), // Track disposed effects
};
