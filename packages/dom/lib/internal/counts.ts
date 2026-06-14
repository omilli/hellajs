/**
 * @internal
 * Tracks event types with registered delegated handlers for fast-exit optimization in event delegation.
 */
export const handlerCounts = new Set<string>();
