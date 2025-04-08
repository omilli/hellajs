import { getDefaultContext } from "../context";
import type { EffectFn } from "../types";
import { setActiveTracker, unsubscribeDependencies } from "../utils";
import { handleError } from "../utils/error";

/**
 * Creates an effect that runs when its dependencies change.
 * Effects automatically track reactive dependencies used within the effect function
 * and re-execute when those dependencies change.
 *
 * @param fn - The function to execute when dependencies change
 * @param options - Optional configuration for the effect behavior
 * @returns A cleanupfunction that can be called to clean up the effect
 */
export function effect(
	fn: EffectFn,
	{ reactive } = getDefaultContext(),
): EffectFn {
	// Get the reactive context props
	const {
		activeTracker,
		currentExecutingEffect,
		executionContext,
		effectDependencies,
		parentChildEffectsMap,
		pendingNotifications,
		pendingRegistry,
	} = reactive;
	// Debounce timeout ID
	let timeoutId: ReturnType<typeof setTimeout> | undefined;
	/**
	 * Manages debouncing and schedules the effect's execution
	 */
	const handleEffectScheduling = () => {
		// Check if the effect is disposed or if it should be skipped
		const skipWhen = [observer._disposed, detectCircularDependency()];
		// If any condition is true, skip execution
		if (skipWhen.some(Boolean)) {
			return;
		}
		// Use the scheduler for effect execution
		executeEffectCore();
	};
	/**
	 * Checks if the effect is creating a circular dependency
	 */
	const detectCircularDependency = (): boolean => {
		// Check if the effect is already in the execution context
		if (executionContext.includes(observer)) {
			// Log a warning for circular dependency
			console.log("Circular dependency: ", {
				runningEffectsSize: executionContext.length,
				effect: observer.toString().substring(0, 50),
			});
			throw new Error("Circular dependency detected in effect");
		}
		return false;
	};
	/**
	 * Core function to execute the effect with proper tracking setup
	 */
	const executeEffectCore = () => {
		// Remove prior subscriptions
		unsubscribeDependencies(observer, reactive);
		// Clean up any existing child effects before re-running
		disposeChildEffects();
		// Set the current executing effect to this effect
		reactive.currentExecutingEffect = disposeEffect;
		// Set the active tracker to this effect
		setActiveTracker(reactive, observer);
		// Push the observer to the execution context
		executionContext.push(observer);
		try {
			// Execute the effect function
			const result = fn() as void | Promise<void> | (() => void);
			handleEffectResult(result);
		} catch (error) {
			handleError(error);
		} finally {
			// Restore previous context
			executionContext.pop();
			// Restore the active tracker
			setActiveTracker(reactive, activeTracker);
			// Restore the current executing effect
			reactive.currentExecutingEffect = currentExecutingEffect;
		}
	};
	/**
	 * Handles the result returned by the effect function
	 */
	const handleEffectResult = (result: void | Promise<void> | (() => void)) => {
		// Handle async functions that return promises
		if (result instanceof Promise) {
			result.catch((error) => {
				handleError(error);
			});
		}
	};
	// Create an observer function
	const observer: EffectFn = () => handleEffectScheduling();
	// Attach metadata to the observer
	Object.defineProperties(observer, {
		_hasRun: { value: false, writable: true },
		_disposed: { value: false, writable: true },
	});
	// Create dependency tracking set in context
	effectDependencies.set(observer, new Set());
	/**
	 * Handles cleanup of all resources associated with the effect
	 */
	const disposeEffect = () => {
		// Cancel any pending debounced execution
		if (timeoutId) {
			clearTimeout(timeoutId);
			timeoutId = undefined;
		}
		// Mark as disposed immediately to prevent any future executions
		observer._disposed = true;
		// Also mark the cleanupfunction as disposed for testing
		Object.defineProperty(disposeEffect, "_disposed", { value: true });
		// Dispose all child effects first
		disposeChildEffects();
		// Remove from pending notifications if it's queued
		removeFromPendingQueue();
		// Clean up all dependencies and registries
		unsubscribeDependencies(observer, reactive);
		pendingRegistry.delete(observer);
		effectDependencies.delete(observer);
	};
	/**
	 * Disposes any child effects created by this effect
	 */
	const disposeChildEffects = () => {
		// Get the child effects associated with this effect
		const childEffects = parentChildEffectsMap.get(disposeEffect);
		// If child effects exist
		if (childEffects) {
			// Iterate through each child effect and cleanupof it
			for (const childDispose of childEffects) {
				childDispose();
			}
			// Clear the child effects set
			childEffects.clear();
			// Remove the entry from the parent-child effects map
			parentChildEffectsMap.delete(disposeEffect);
		}
	};
	/**
	 * Removes the effect from the pending notifications queue
	 */
	const removeFromPendingQueue = () => {
		// Get the pending notifications for this effect
		const pendingIndex = pendingNotifications.findIndex(
			(e) => e === observer || e._effect === observer || observer._effect === e,
		);
		// If found, remove it from the pending notifications
		if (pendingIndex !== -1) {
			pendingNotifications.splice(pendingIndex, 1);
		}
	};
	// Add metadata to the cleanupfunction
	Object.defineProperties(disposeEffect, {
		_name: { value: name },
		_effect: { value: observer },
	});
	// Register parent-child relationship for automatic cleanup
	if (currentExecutingEffect) {
		// Get the parent-child effects map
		let parentChildEffects = parentChildEffectsMap.get(currentExecutingEffect);
		// If it doesn't exist
		if (!parentChildEffects) {
			// Create a new set
			parentChildEffects = new Set();
			// Store the parent-child effects
			parentChildEffectsMap.set(currentExecutingEffect, parentChildEffects);
		}
		// Add this effect to the parent's child effects
		parentChildEffects.add(disposeEffect);
	}
	// Initial execution
	observer();
	// Return cleanup function
	return disposeEffect;
}
