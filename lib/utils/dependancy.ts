import type { EffectFn, ReactiveContext, Signal, SignalBase } from "../types";

/**
 * Unsubscribe an effect from all its dependencies
 *
 * @param effect - The effect function to unsubscribe
 * @param reactive - The reactive context containing the effect dependencies
 */
export function unsubscribeDependencies(
	effect: EffectFn,
	{ effectDependencies }: ReactiveContext,
) {
	// Get all the dependencies this effect was tracking
	const ctxDeps = effectDependencies.get(effect) as Set<Signal<unknown>>;
	// Let's make a copy of all the dependencies to work with
	const allDeps = new Set(ctxDeps);
	// Now we need to go through each signal and tell it this effect is no longer a dependent
	for (const signal of allDeps) {
		if (signal?._deps) {
			// Check if the signal has dependents
			const subscribers = signal._deps;
			// We'll collect references to remove in this array
			const refsToRemove: WeakRef<EffectFn>[] = [];
			// Check each weak reference to an effect
			for (const weakRef of subscribers) {
				const subscribedEffect = weakRef.deref();
				// We want to remove it if:
				// - The reference is dead (already garbage collected)
				// - It's directly the same effect we're removing
				// - It's linked to our effxect via the _effect property chain
				if (
					!subscribedEffect ||
					subscribedEffect === effect ||
					subscribedEffect._effect === effect ||
					effect._effect === subscribedEffect
				) {
					// Mark this reference for removal
					refsToRemove.push(weakRef);
				}
			}

			// Now safely remove all the references we marked
			for (const ref of refsToRemove) {
				subscribers.delete(ref);
			}
		}
	}
	// Finally, clean up our context tracking data
	if (ctxDeps) {
		// Clear the set of dependencies
		ctxDeps.clear();
		// Remove the effect from the dependency map
		effectDependencies.delete(effect);
	}
}
