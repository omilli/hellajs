import { ReactiveState } from "./reactive.types";

export const HELLA_REACTIVE: ReactiveState = {
  activeEffects: [],
  pendingEffects: new Set(),
  disposedEffects: new WeakSet(), // Track disposed effects
};
