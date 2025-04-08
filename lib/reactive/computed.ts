import type { ComputedFn, SignalValue } from "../types";
import { handleError } from "../utils/error";
import { effect } from "./effect";
import { signal } from "./signal";

/**
 * Creates a computed signal that derives its value from other reactive dependencies.
 * The computed value is lazily evaluated and cached until its dependencies change.
 *
 * @template T - The type of the computed value
 * @param computedFn - Function that computes the derived value
 * @param options - Optional configuration options
 *
 * @returns A signal-like accessor function that returns the current computed value
 *
 */
export function computed<T>(computedFn: ComputedFn<T>): SignalValue<T> {
	// Extract options with defaults
	const backingSignal = signal<T>(undefined as unknown as T);
	// Cached value
	let value: T;
	// Indicates if the cached value needs to be recomputed
	let isStale = true;
	// Indicates if this computed signal has been cleaned up
	let isDisposed = false;
	/**
	 * Computes the value and updates the internal state
	 * Triggers the onComputed callback if provided
	 */
	const computeAndUpdate = () => {
		// Get the new value from the computed function
		const newValue = computedFn();
		// Check if the new value is different from the current value
		const valueChanged = !Object.is(value, newValue);
		// Only update the backing signal if the value changed or memo is false
		if (valueChanged) {
			backingSignal.set(newValue);
		}
		// Update the cached value
		value = newValue;
		// Mark as not stale
		isStale = false;
		return newValue;
	};
	/**
	 * Safely attempts to compute the value
	 * @param withUpdate - Whether to update the internal state with the computed value
	 * @returns The computed value or undefined if an error occurred
	 */
	const tryCompute = (withUpdate = true) => {
		try {
			return withUpdate ? computeAndUpdate() : computedFn();
		} catch (error) {
			handleError(error);
		}
	};
	/**
	 * Set up a reactive effect that tracks dependencies of the computed function
	 * This makes the computed value automatically update when dependencies change
	 */
	const cleanup = effect(() => {
		if (isDisposed) return;
		// Mark as stale whenever dependencies change
		isStale = true;
		tryCompute(true);
	});
	/**
	 * The accessor function that returns the computed value
	 * Lazily computes the value when accessed if it's stale
	 */
	const accessor = () => {
		// Compute only if the value is stale and not disposed
		if (isStale && !isDisposed) {
			tryCompute(true);
		}
		return backingSignal();
	};
	// Add metadata and cleanup method to the accessor function
	Object.defineProperties(accessor, {
		_isComputed: { value: true },
		_cleanup: {
			value: () => {
				isDisposed = true;
				cleanup();
			},
		},
	});
	return accessor as SignalValue<T>;
}
