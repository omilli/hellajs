import type { ReactiveContext } from "../types";

/**
 * Flushes all pending effects in the reactive context.
 *
 * @param reactive - The reactive context
 */
export function flushEffects({
	pendingNotifications,
	pendingRegistry,
}: ReactiveContext): void {
	// If there's nothing to do, let's bail early
	if (pendingNotifications.length === 0) return;
	// Sort effects by priority - important effects should run first
	const effectsToRun = [...pendingNotifications].sort((a, b) => {
		// Higher priority values run first
		return (b._priority || 0) - (a._priority || 0);
	});
	// Clear the queues BEFORE running effects - this prevents cycles if effects trigger other effects
	pendingNotifications.length = 0;
	pendingRegistry.clear();
	// Now let's run each effect
	for (const effect of effectsToRun) {
		// Skip disposed effects - they shouldn't run anymore
		if (!effect._disposed) {
			// Run the effect!
			effect();
		}
	}
}
