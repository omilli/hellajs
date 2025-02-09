import { SecurityState, Signal } from "./types";

/**
 * Internal security state for reactive system
 * Using WeakMap to prevent memory leaks and global access
 */
const state: SecurityState = {
  effectDependencies: new WeakMap(),
  signalSubscriberCount: new WeakMap(),
  maxDependencies: 100,
  maxSubscribers: 1000,
};

export function subscriberCount(signal: Signal<any>): number {
  return state.signalSubscriberCount.get(signal) ?? 0;
}

export function trackSubscriber(signal: Signal<any>, count: number): void {
  state.signalSubscriberCount.set(signal, count);
}

export function effectDeps(fn: () => void): Set<Signal<any>> | undefined {
  return state.effectDependencies.get(fn);
}

export function trackEffect(fn: () => void, deps: Set<Signal<any>>): void {
  state.effectDependencies.set(fn, deps);
}

export function maxDepsExceeded(size: number): boolean {
  return size > state.maxDependencies;
}

export function maxSubscribersExceeded(size: number): boolean {
  return size > state.maxSubscribers;
}

export function maxSubscribersLimit(): number {
  return state.maxSubscribers;
}
