/**
 * Represents a node in a stack data structure.
 * @template T
 */
export interface Stack<T> {
  sv: T;
  sp: Stack<T> | undefined;
}

/**
 * Base interface for all reactive nodes (signals, computeds, effects).
 */
export interface Reactive {
  /** Dependencies of this node. */
  rd?: Link;
  /** The previous dependency link. */
  rpd?: Link;
  /** Subscribers to this node. */
  rs?: Link;
  /** The previous subscriber link. */
  rps?: Link;
  /** Bitmask representing the state of the node (e.g., dirty, tracking). */
  rf: number;
}

/**
 * Represents a link in the doubly-linked list between reactive nodes.
 */
export interface Link {
  /** The source node (the one being subscribed to). */
  ls: Reactive;
  /** The target node (the subscriber). */
  lt: Reactive;
  /** The previous subscriber of the source. */
  lps: Link | undefined;
  /** The next subscriber of the source. */
  lns: Link | undefined;
  /** The previous dependency of the target. */
  lpd: Link | undefined;
  /** The next dependency of the target. */
  lnd: Link | undefined;
}

/**
 * Bitmask flags for the state of a reactive node.
 */
export const F = {
  /** Clean state. */
  C: 0,
  /** Writable signal. */
  W: 1,
  /** Guarded effect (prevents self-triggering). */
  G: 2,
  /** Currently tracking dependencies. */
  T: 4,
  /** Currently computing (eMit). */
  M: 8,
  /** Dirty state, needs re-evaluation. */
  D: 16,
  /** Pending state, might be dirty. */
  P: 32,
} as const;

/** Flag to indicate an effect is scheduled to run. */
export const SCHEDULED = 128;

/**
 * Base interface for a signal.
 * @template T
 */
export interface SignalBase<T = unknown> extends Reactive {
  /** The last confirmed value. */
  sbv: T;
  /** The current (potentially uncommitted) value. */
  sbc: T;
}

/**
 * A function that acts as both a getter and a setter for a signal's value.
 * @template T
 */
export type Signal<T> = {
  /** Gets the current value. */
  (): T;
  /** Sets a new value. */
  (value: T): void;
};

/**
 * Base interface for a computed signal.
 * @template T
 */
export interface ComputedBase<T = unknown> extends Reactive {
  /** The cached value of the computation. */
  cbc: T | undefined;
  /** The function that computes the value. */
  cbf: (previousValue?: T) => T;
}

/**
 * A read-only signal, typically a computed signal.
 * @template T
 */
export type ReadonlySignal<T> = () => T;

/**
 * Interface for an effect.
 */
export interface EffectValue extends Reactive {
  /** The function to execute as a side effect. */
  ef(): void;
}