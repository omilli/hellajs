/**
 * Bitmask flags for the state of a reactive node.
 */

/** Clean state. */
export const CLEAN = 0;

/** Writable signal. */
export const WRITABLE = 1;

/** Guarded effect (prevents self-triggering). */
export const GUARDED = 2;

/** Currently tracking dependencies. */
export const TRACKING = 4;

/** Currently computing or executing. */
export const COMPUTING = 8;

/** Dirty state, needs re-evaluation. */
export const DIRTY = 16;

/** Pending state, might be dirty. */
export const PENDING = 32;