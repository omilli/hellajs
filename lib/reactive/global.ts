import { ReactiveState } from ".";

export const REACTIVE_STATE: ReactiveState = {
  batchingSignals: false,
  activeEffects: [],
  pendingEffects: new Set(),
  stores: new WeakMap(),
};
