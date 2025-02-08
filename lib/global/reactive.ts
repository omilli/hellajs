import { ReactiveState } from "../reactive";

export const REACTIVE_STATE: ReactiveState = {
  batchingSignals: false,
  activeEffects: [],
  pendingEffects: new Set(),
  stores: new WeakMap(),
};
