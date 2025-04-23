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

export function signal<T>(value: T): Signal<T> {
	let _value = value;
	const listeners: Set<(value: T) => void> = new Set();

	const signal = () => _value;

	signal.set = (newValueOrFn: T | ((prev: T) => T)) => {
		const newValue =
			typeof newValueOrFn === "function"
				? (newValueOrFn as (prev: T) => T)(_value)
				: newValueOrFn;

		if (_value !== newValue) {
			_value = newValue;
			listeners.forEach((listener) => listener(_value));
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
		listeners.forEach((listener) => listener(_value));
	};

	return signal;
}

export function computed<T>(fn: () => T): Signal<T> {
	const result = signal(fn());
	let deps: Set<Signal<any>> = new Set();

	// Track dependencies and update when they change
	function trackAndCompute() {
		// Clean up old dependencies
		deps.forEach((dep) => {
			/* unsubscribe logic */
		});

		deps = new Set();
		// Capture new dependencies and compute value
		const value = fn();
		result.set(value);
		return value;
	}

	return result;
}

export function effect(fn: () => void | (() => void)): () => void {
	let cleanup: void | (() => void);

	// Initial run
	cleanup = fn();

	// Return function to stop the effect
	return () => {
		if (typeof cleanup === "function") {
			cleanup();
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
			updates.forEach((signal) => signal.notify());
		}
		return result;
	} catch (error) {
		batchDepth--;
		pendingUpdates.clear();
		throw error;
	}
}
