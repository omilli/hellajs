import { ReactiveSecurity, Signal } from "./reactive.types";

/**
 * Internal security state for reactive system
 * Using WeakMap to prevent memory leaks and global access
 */
const REACTIVE_SECURITY: ReactiveSecurity = {
  effectDependencies: new WeakMap(),
  subscriberCount: new WeakMap(),
  maxSubscribers: 1000,
};

export function subscriberCount(signal: Signal<any>): number {
  return REACTIVE_SECURITY.subscriberCount.get(signal) ?? 0;
}

export function trackSubscriber(signal: Signal<any>, count: number): void {
  REACTIVE_SECURITY.subscriberCount.set(signal, count);
}

export function effectDeps(fn: () => void): Set<Signal<any>> | undefined {
  return REACTIVE_SECURITY.effectDependencies.get(fn);
}

export function trackEffect(fn: () => void, deps: Set<Signal<any>>): void {
  REACTIVE_SECURITY.effectDependencies.set(fn, deps);
}

export function maxSubscribersExceeded(size: number): boolean {
  return size > REACTIVE_SECURITY.maxSubscribers;
}

export function maxSubscribersLimit(): number {
  return REACTIVE_SECURITY.maxSubscribers;
}
