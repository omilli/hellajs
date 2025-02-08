import { ReactiveState } from ".";

export const REACTIVE_STATE: ReactiveState = {
  batchingSignals: false,
  activeEffects: [],
  pendingEffects: new Set(),
  stores: new WeakMap(),
  resourceCache: new Map(),
  activeRequests: new Map(),
  security: {
    effectDependencies: new WeakMap(),
    signalSubscriberCount: new WeakMap(),
    maxDependencies: 100,
    maxSubscribers: 1000,
  },
};
