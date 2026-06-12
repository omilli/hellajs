/**
 * @internal
 * Tracks handler count per event type for fast-exit optimization in event delegation.
 */
export const handlerCounts = new Map<string, number>();
