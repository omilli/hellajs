type SignalSetter<T> = (newValue: T) => void;
type SignalListener<T> = (value: T) => void;
type SignalUnsubscribe = () => void;
type SignalSubscribe<T> = (listener: SignalListener<T>) => SignalUnsubscribe;

export type Signal<T> = {
	(): T;
	set: SignalSetter<T>;
	subscribe: SignalSubscribe<T>;
	notify: () => void;
};

// Track which signal is currently being computed
let currentComputation: ((value: any) => void) | null = null;

export function signal<T>(value: T): Signal<T> {
	let _value = value;
	const listeners: Set<(value: T) => void> = new Set();

	const signal = () => {
		// If we're currently computing a derived value, register this signal as a dependency
		if (currentComputation) {
			currentComputation(signal);
		}
		return _value;
	};

	signal.set = (newValueOrFn: T | ((prev: T) => T)) => {
		const newValue =
			typeof newValueOrFn === "function"
				? (newValueOrFn as (prev: T) => T)(_value)
				: newValueOrFn;

		if (_value !== newValue) {
			_value = newValue;

			// Use batching mechanism to prevent cascading updates
			if (batchDepth > 0) {
				pendingUpdates.add(signal);
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

	signal.subscribe = (listener: (value: T) => void) => {
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

export function computed<T>(fn: () => T): Signal<T> {
	const result = signal(fn());
	let deps = new Map<Signal<any>, SignalUnsubscribe>();
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
			currentComputation = trackSignal;
			const newValue = fn();
			result.set(newValue);
		} finally {
			currentComputation = prevComputation;
			isComputing = false;
		}
	}

	// Function that will be called when a signal is accessed during computation
	function trackSignal(signal: Signal<any>) {
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
			currentComputation(wrappedSignal);
		}
		return originalGet();
	}) as Signal<T>;

	// Copy other properties
	wrappedSignal.set = result.set;
	wrappedSignal.subscribe = result.subscribe;
	wrappedSignal.notify = result.notify;

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
		if (typeof cleanup === "function") {
			try {
				cleanup();
			} catch (error) {
				console.error("Error in effect cleanup:", error);
			}
		}
	};
}

let batchDepth = 0;
const pendingUpdates = new Set<Signal<any>>();

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
