import type { EffectFn, ReactiveContext, Signal, SignalBase } from "../types";
import { flushEffects } from "./flush";
import { getActiveTracker, hasActiveTracker } from "./tracker";

/**
 * Registers a dependency relationship between an effect function and a source.
 * This function is used in reactive contexts to track which effects depend on which sources.
 *
 * @param context - The reactive context containing effect dependencies
 * @param effect - The effect function that depends on the source
 * @param source - The source that the effect depends on
 */
export function addDependency(
	{ effectDependencies }: ReactiveContext,
	effect: EffectFn,
	source: unknown,
): void {
	// Get the effect's current dependencies or create a new set if none exist yet
	const deps = effectDependencies.get(effect) || new Set();
	// Add this source to the effect's dependencies - now the effect officially depends on this source
	deps.add(source);
	// Store the updated dependencies back in our context's dependency map
	effectDependencies.set(effect, deps);
}

/**
 * Track a signal dependency in the current effect
 *
 * @param reactive - The reactive context
 * @param signal - The signal to track
 */
export function trackDependency(
	reactive: ReactiveContext,
	signal: SignalBase,
): void {
	// First, let's check if we're even in a tracking context - if not, nothing to do here
	if (!hasActiveTracker(reactive)) return;
	// Get the currently running effect that should track this dependency
	const activeEffect = getActiveTracker(reactive);
	// Double-check we actually have an effect to track - just to be safe
	if (!activeEffect) return;
	// Now we need to create a bidirectional relationship:
	// 1. First, tell the effect it depends on this signal
	addDependency(reactive, activeEffect, signal);
	// 2. Then, tell the signal it has this effect as a dependent (using WeakRef to avoid memory leaks)
	signal._deps.add(new WeakRef(activeEffect));
}

/**
 * Notify all dependents of a signal about its change
 *
 * @param reactive - The reactive context
 * @param signal - The signal that changed
 */
export function notifyDependents(
	reactive: ReactiveContext,
	signal: SignalBase,
): void {
	const { batchDepth, pendingRegistry, pendingNotifications } = reactive;
	// Quick check - if we're not batching AND there are no dependents, we can skip all this work
	if (batchDepth === 0 && signal._deps.size === 0) return;
	// We'll collect live effects here - these are the ones we need to run
	const liveEffects: EffectFn[] = [];
	// And we'll collect dead references here - these need cleaning up
	const deadRefs: WeakRef<EffectFn>[] = [];
	// Go through all dependencies and sort them into live ones and dead ones
	for (const ref of signal._deps) {
		// Try to get the actual effect from the weak reference
		const effect = ref.deref();
		if (effect) {
			// The effect still exists, so we'll need to run it
			liveEffects.push(effect);
		} else {
			// The effect has been garbage collected, so we'll need to clean up the reference
			deadRefs.push(ref);
		}
	}
	// Spring cleaning time! Remove all those dead references from the signal
	for (const ref of deadRefs) {
		signal._deps.delete(ref);
	}
	// If we're batching changes, just collect effects to run later
	if (batchDepth > 0) {
		for (const effect of liveEffects) {
			// Only add it if it's not already queued (avoid duplicates)
			if (!pendingRegistry.has(effect)) {
				// Add to our queue of effects to run
				pendingNotifications.push(effect);
				// Mark as queued so we don't add it again
				pendingRegistry.add(effect);
			}
		}
		// We're done for now - the effects will run when the batch completes
		return;
	}
	// Not batching, so let's sort by priority - this ensures more important effects run first
	const sorted = [...liveEffects].sort((a, b) => {
		// Get priority values, defaulting to 0 if not specified
		const priorityA = a._priority || 0;
		const priorityB = b._priority || 0;
		// Sort in descending order (higher priority runs first)
		return priorityB - priorityA;
	});
	// Add all sorted effects to the pending queue
	for (const effect of sorted) {
		// Again, check to avoid duplicates
		if (!pendingRegistry.has(effect)) {
			// Queue it up
			pendingNotifications.push(effect);
			// Mark as queued
			pendingRegistry.add(effect);
		}
	}
	// If we're not batching, flush the effects immediately
	if (batchDepth === 0) {
		flushEffects(reactive);
	}
}

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
			const refsToRemove = [];
			// Check each weak reference to an effect
			for (const weakRef of subscribers) {
				const subscribedEffect = weakRef.deref();
				// We want to remove it if:
				// - The reference is dead (already garbage collected)
				// - It's directly the same effect we're removing
				// - It's linked to our effect via the _effect property chain
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
