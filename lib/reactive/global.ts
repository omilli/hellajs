import { ReactiveState } from "./types";

export const REACTIVE_STATE: ReactiveState = {
  batchingSignals: false,
  activeEffects: [],
  pendingEffects: new Set(),
  resourceCache: new Map(),
  activeRequests: new Map(),
};
