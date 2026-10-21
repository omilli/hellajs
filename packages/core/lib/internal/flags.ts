/**
 * Bitmask flags for the state of a reactive node. Values 0-32 are the vendored
 * reactive system's contract (lib/internal/system.ts) — do not renumber; 128 is a
 * host-owned extension.
 */

/** Clean state. */
export const NONE = 0;

/** Value node (signal or computed) — propagation descends into its subscribers. */
export const MUTABLE = 1;

/** Armed effect — notify queues it and clears the bit; the bit means "awaiting notification". */
export const WATCHING = 2;

/** Node is currently executing — re-entrant propagation suppresses notification. */
export const RECURSED_CHECK = 4;

/** Recursive notification landed while the node was executing. */
export const RECURSED = 8;

/** Dirty state, needs re-evaluation. */
export const DIRTY = 16;

/** Pending state, might be dirty — validate before deciding. */
export const PENDING = 32;

/** Effect's dependencies are all signals — a write proves change, so notify marks it DIRTY directly and flush runs it without stale validation. */
export const SIGNAL_DEPS = 128;
