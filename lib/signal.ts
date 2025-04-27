import type {
	ReadonlySignal,
	Signal,
	SignalComputation,
	SignalListener,
	SignalUnsubscribe,
	WriteableSignal,
} from "./types";
import { isFunction } from "./utils";

// Track which signal is currently being computed
let currentComputation: ((value: unknown) => void) | null = null;

export function signal<T>(value: T): WriteableSignal<T> {
	let _value = value;
	const listeners: SignalListener<T>[] = [];

	const signal = () => {
		// If we're currently computing a derived value, register this signal as a dependency
		if (currentComputation) {
			currentComputation(signal);
		}
		return _value;
	};

	signal.set = (newValueOrFn: T | ((prev: T) => T)) => {
		const newValue = isFunction(newValueOrFn)
			? (newValueOrFn as (prev: T) => T)(_value)
			: newValueOrFn;

		if (_value !== newValue) {
			_value = newValue;

			// Use batching mechanism to prevent cascading updates
			if (batchDepth > 0) {
				// Only add if not already in the array (maintain Set-like uniqueness)
				if (!pendingUpdates.includes(signal as Signal<unknown>)) {
					pendingUpdates.push(signal as Signal<unknown>);
				}
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
		// Only add if not already in the array (maintain Set-like uniqueness)
		if (!listeners.includes(listener)) {
			listeners.push(listener);
		}
		return () => {
			const index = listeners.indexOf(listener);
			if (index !== -1) {
				listeners.splice(index, 1);
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
	const deps = new Map<WriteableSignal<unknown>, SignalUnsubscribe>();
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
				// Use queueMicrotask instead of setTimeout for better performance
				queueMicrotask(() => update());
			});
			deps.set(signal, unsubscribe);
		}
	}

	// Create a proper wrapped signal that preserves all the signal interface
	const wrappedSignal = (() => {
		// Track this computation if we're inside another computed
		if (currentComputation) {
			currentComputation(wrappedSignal as WriteableSignal<unknown>);
		}
		return result();
	}) as ReadonlySignal<T>;

	// Copy other properties
	wrappedSignal.subscribe = result.subscribe;
	wrappedSignal.notify = result.notify;

	// Run once to establish initial dependencies
	update();

	return wrappedSignal;
}

export function effect(fn: () => void | (() => void)): () => void {
	const deps = new Map<WriteableSignal<unknown>, SignalUnsubscribe>();
	let cleanup: void | (() => void);
	let isRunning = false;

	function execute() {
		if (isRunning) return; // Prevent recursive executions

		// Clean up previous run
		if (isFunction(cleanup)) {
			try {
				cleanup();
			} catch (error) {
				console.error("Error in effect cleanup:", error);
			}
		}

		// Clean up old dependencies
		for (const unsubscribe of deps.values()) {
			unsubscribe();
		}
		deps.clear();

		// Set up tracking and execute effect
		isRunning = true;
		const prevComputation = currentComputation;

		try {
			(currentComputation as SignalComputation<unknown>) = trackSignal;
			cleanup = fn();
		} catch (error) {
			console.error("Error in effect function:", error);
		} finally {
			currentComputation = prevComputation;
			isRunning = false;
		}
	}

	// Function that will be called when a signal is accessed during execution
	function trackSignal(signal: WriteableSignal<unknown>) {
		if (!deps.has(signal)) {
			// Subscribe to this dependency
			const unsubscribe = signal.subscribe(() => {
				queueMicrotask(() => execute());
			});
			deps.set(signal, unsubscribe);
		}
	}

	// Initial execution to establish dependencies
	execute();

	// Return function to stop the effect
	return () => {
		// Clean up function
		if (isFunction(cleanup)) {
			try {
				cleanup();
			} catch (error) {
				console.error("Error in effect cleanup:", error);
			}
		}

		// Unsubscribe from all dependencies
		for (const unsubscribe of deps.values()) {
			unsubscribe();
		}
		deps.clear();
	};
}

let batchDepth = 0;
const pendingUpdates: Signal<unknown>[] = [];

export function batch<T>(fn: () => T): T {
	batchDepth++;
	try {
		const result = fn();
		if (--batchDepth === 0) {
			const updates = [...pendingUpdates]; // Create a copy to safely iterate
			pendingUpdates.length = 0; // Clear the array

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
		pendingUpdates.length = 0; // Clear the array
		console.error("Error in batch function:", error);
		throw error;
	}
}
