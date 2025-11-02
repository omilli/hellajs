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
 * Base interface for a signal.
 * @template T
 */
export interface SignalState<T = unknown> extends Reactive {
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
export interface ComputedState<T = unknown> extends Reactive {
  /** The cached value of the computation. */
  cbc: T | undefined;
  /** The function that computes the value. */
  cbf: (previousValue?: T) => T;
}

/**
 * Interface for an effect.
 */
export interface EffectState extends Reactive {
  /** The function to execute as a side effect. */
  ef(): void;
}