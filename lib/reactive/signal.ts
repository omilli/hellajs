import { getDefaultContext } from "../context";
import { CONTEXT_STORE } from "../context/store";
import type { EffectFn, Signal } from "../types";
import { flushEffects, getActiveTracker } from "../utils";

/**
 * Creates a new signal with the given initial value and options.
 * A signal is a reactive primitive that tracks a single value and notifies
 * subscribers when the value changes.
 *
 * @template T - The type of value stored in the signal
 * @param initialValue - The initial value of the signal
 * @param options - Additional options for configuring the signal behavior
 * @returns A signal function that can be called to read the current value
 */
export function signal<T>(
	initialValue: T,
	{ reactive } = getDefaultContext(),
): Signal<T> {
	// Store the current value in a local variable
	let value = initialValue;
	// Track effects that depend on this signal
	const subscribers = new Set<WeakRef<EffectFn>>();

	const signalFn = (() => {
		// Check if this read is happening during an effect execution in this context
		const activeEffect = getActiveTracker(reactive);

		// If so, establish bidirectional links between effect and signal
		if (activeEffect) {
			// Get/create the set of signals this effect depends on
			const effectDeps =
				reactive.effectDependencies.get(activeEffect) || new Set();
			// Add this effect as a subscriber to the signal
			subscribers.add(new WeakRef(activeEffect));
			// Add this signal to the effect's dependencies
			effectDeps.add(signalFn);
			// Update the context's effect dependencies map
			reactive.effectDependencies.set(activeEffect, effectDeps);
		}

		// Check all other contexts for active effects regardless of whether
		// we found an active effect in this signal's context
		for (const [_, ctx] of CONTEXT_STORE.entries()) {
			// Skip signal's own context (already checked)
			if (ctx.reactive === reactive) continue;

			// Check if this context has an active effect
			const otherActiveEffect = getActiveTracker(ctx.reactive);
			if (otherActiveEffect) {
				// Track the effect from the other context
				const effectDeps =
					ctx.reactive.effectDependencies.get(otherActiveEffect) || new Set();
				subscribers.add(new WeakRef(otherActiveEffect));
				effectDeps.add(signalFn);
				ctx.reactive.effectDependencies.set(otherActiveEffect, effectDeps);
			}
		}

		return value;
	}) as Signal<T>;
	/**
	 * Updates the signal value and notifies all subscribers
	 * This is the core update mechanism that ensures reactivity
	 * @param newValue - The new value to set
	 */
	const update = (newValue: T) => {
		// Set the current value to the new value
		value = newValue;
		// Schedule all dependent effects for execution
		if (subscribers.size === 0) return;
		// Efficient deduplication using the pending registry
		let hasQueuedEffects = false;
		// Process subscribers, cleaning up dead references
		for (const ref of subscribers) {
			const effect = ref.deref();
			if (effect) {
				// Only queue if not already pending
				if (!reactive.pendingRegistry.has(effect)) {
					reactive.pendingNotifications.push(effect);
					reactive.pendingRegistry.add(effect);
					// Mark that we have queued effects
					hasQueuedEffects = true;
				}
			} else {
				// Clean up dead reference
				subscribers.delete(ref);
			}
		}
		// Run effects immediately if not batching and we have queued effects
		if (reactive.batchDepth === 0 && hasQueuedEffects) {
			flushEffects(reactive);
		}
	};
	/**
	 * Direct value setter that validates and updates the signal value
	 * This is exposed as the .set() method on the signal
	 * @param newValue - The new value to set
	 */
	const setter = (newValue: T) => {
		// Only update if the value has actually changed
		if (newValue !== value) {
			update(newValue);
		}
	};
	/**
	 * Functional updater that accepts a function to compute the new value
	 * This is exposed as the .update() method on the signal
	 * @param updateFn - Function that receives current value and returns new value
	 */
	const updater = (updateFn: (currentValue: T) => T) => {
		const newValue = updateFn(value);
		signalFn.set(newValue);
	};
	// Attach methods and properties to the signal function
	Object.defineProperties(signalFn, {
		_deps: { get: () => subscribers }, // Access to subscribers for debugging/tooling
		set: { value: setter }, // Method to update the signal value
		update: { value: updater }, // Method to update via a function
	});
	return signalFn;
}
