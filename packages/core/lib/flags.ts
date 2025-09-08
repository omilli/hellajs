/**
 * Bitmask flags for the state of a reactive node.
 */
export const FLAGS = {
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