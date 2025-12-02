/**
 * Tracks handler count per event type for fast "has any handlers" check.
 * Shared between registry (cleanup) and events (delegation).
 */
export const handlerCounts = new Map<string, number>();
