import type { ReadonlySignal, Signal, SignalComputation, SignalListener, SignalUnsubscribe, WriteableSignal } from "./types";
import { isFunction } from "./utils";

// Track which signal is currently being computed
let currentComputation: ((value: unknown) => void) | null = null;

export function signal<T>(value: T): WriteableSignal<T> {
	let _value = value;
	const listeners: Set<SignalListener<T>> = new Set();

	const signal = () => {
		// If we're currently computing a derived value, register this signal as a dependency
		if (currentComputation) {
			currentComputation(signal);
		}
		return _value;
	};

	signal.set = (newValueOrFn: T | ((prev: T) => T)) => {
		const newValue =
			isFunction(newValueOrFn)
				? (newValueOrFn as (prev: T) => T)(_value)
				: newValueOrFn;

		if (_value !== newValue) {
			_value = newValue;

			// Use batching mechanism to prevent cascading updates
			if (batchDepth > 0) {
				pendingUpdates.add(signal as Signal<unknown>);
			} else {
				listeners.forEach((listener) => {
					try {
						listener(_value);
					} catch (error) {
						console.error("Error in signal listener:", error);
					}
				});
			}
		}
	};

	signal.subscribe = (listener: SignalListener<T>) => {
		listeners.add(listener);
		return () => {
			if (listeners.has(listener)) {
				listeners.delete(listener);
			}
		};
	};

	signal.notify = () => {
		listeners.forEach((listener) => {
			try {
				listener(_value);
			} catch (error) {
				console.error("Error in signal listener:", error);
			}
		});
	};

	return signal;
}

/**
 * Creates a derived signal that recomputes its value whenever its dependencies change.
 * The dependencies are automatically tracked when the compute function accesses other signals.
 * 
 * @param fn - A function that computes the derived value based on other signals
 * @returns A readonly signal that updates automatically when dependencies change
 */
export function computed<T>(fn: () => T): ReadonlySignal<T> {
	const result = signal(fn());
	let deps = new Map<WriteableSignal<unknown>, SignalUnsubscribe>();
	let isComputing = false;

	function update() {
		if (isComputing) return; // Prevent cycles

		// Clean up old dependencies
		for (const unsubscribe of deps.values()) {
			unsubscribe();
		}
		deps.clear();

		// Set up tracking and compute new value
		isComputing = true;
		const prevComputation = currentComputation;

		try {
			(currentComputation as SignalComputation<T>) = trackSignal;
			const newValue = fn();
			result.set(newValue);
		} finally {
			currentComputation = prevComputation;
			isComputing = false;
		}
	}

	// Function that will be called when a signal is accessed during computation
	function trackSignal(signal: WriteableSignal<unknown>) {
		if (!deps.has(signal)) {
			// Subscribe to this dependency
			const unsubscribe = signal.subscribe(() => {
				// Wrap the update in a setTimeout to break potential circular dependencies
				queueMicrotask(() => update())
			});
			deps.set(signal, unsubscribe);
		}
	}

	// Intercept signal access to track dependencies
	const originalGet = result;
	const wrappedSignal = (() => {
		// Track this computation if we're inside another computed
		if (currentComputation) {
			currentComputation(wrappedSignal as WriteableSignal<unknown>);
		}
		return originalGet();
	}) as Signal<T>;

	// Copy other properties
	wrappedSignal.subscribe = result.subscribe;
	wrappedSignal.notify = result.notify;

	// Hide the set method by making it private
	Object.defineProperty(wrappedSignal, 'set', {
		enumerable: false,
		value: result.set
	});

	// Run once to establish initial dependencies
	update();

	return wrappedSignal;
}

export function effect(fn: () => void | (() => void)): () => void {
	let cleanup: void | (() => void);

	// Initial run with error handling
	try {
		cleanup = fn();
	} catch (error) {
		console.error("Error in effect function:", error);
	}

	// Return function to stop the effect
	return () => {
		if (isFunction(cleanup)) {
			try {
				cleanup();
			} catch (error) {
				console.error("Error in effect cleanup:", error);
			}
		}
	};
}

let batchDepth = 0;
const pendingUpdates = new Set<Signal<unknown>>();

export function batch<T>(fn: () => T): T {
	batchDepth++;
	try {
		const result = fn();
		if (--batchDepth === 0) {
			const updates = Array.from(pendingUpdates);
			pendingUpdates.clear();

			// Process updates with error handling
			updates.forEach((signal) => {
				try {
					signal.notify();
				} catch (error) {
					console.error("Error during batch update:", error);
				}
			});
		}
		return result;
	} catch (error) {
		batchDepth--;
		pendingUpdates.clear();
		console.error("Error in batch function:", error);
		throw error;
	}
}
