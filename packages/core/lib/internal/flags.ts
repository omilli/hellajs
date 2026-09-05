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

/** Dependency list contains at least one child effect — gates the skip-path scheduled-children walk. */
export const EFFECT_DEP = 8;

/** Dirty state, needs re-evaluation. */
export const DIRTY = 16;

/** Pending state, might be dirty. */
export const PENDING = 32;

/** Computed value node — discriminates computed from signal among WRITABLE nodes. */
export const COMPUTED = 64;

/** Effect is in the flush queue. */
export const SCHEDULED = 128;

/** Effect's dependencies are all signals — a write proves change, so propagation marks it DIRTY directly and flush runs it without stale validation. */
export const SIGNAL_DEPS = 256;