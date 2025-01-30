import { ReactiveState } from "../types";

export const REACTIVE_STATE: ReactiveState = {
  batchingSignals: false,
  activeEffectStack: [],
  pendingEffects: new Set(),
  stores: new WeakMap(),
};
