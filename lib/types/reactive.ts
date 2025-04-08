/**
 * Represents the base interface for a reactive signal.
 * It provides a function to access the signal's value and a set of dependencies.
 */
export interface SignalBase {
	/**
	 * Function to access the signal's value.
	 * @returns The signal's value.
	 */
	(): unknown;
	/**
	 * A set of weak references to the effects that depend on this signal.
	 * Used for dependency tracking and automatic updates.
	 */
	_deps: Set<WeakRef<EffectFn>>;
}

/**
 * Represents a computed signal's value.
 * Extends `SignalBase` and includes a cleanup method and a flag indicating if it's a computed value.
 */
export interface SignalValue<T> {
	/**
	 * Function to access the computed signal's value.
	 * @returns The computed signal's value.
	 */
	(): T;
	/**
	 * Method to clean up resources associated with the computed signal.
	 * This is important to prevent memory leaks.
	 */
	_cleanup: () => void;
	/**
	 * Flag indicating if this is a computed signal.
	 * Used for internal checks and optimizations.
	 */
	_isComputed: boolean;
}

/**
 * Represents a reactive signal that holds a value of type `T`.
 * It provides methods to get, set, and update the value, as well as track dependencies.
 */
export interface Signal<T> {
	/**
	 * Function to access the signal's value.
	 * @returns The signal's value.
	 */
	(): T;
	/**
	 * Method to set the signal's value.
	 * @param value The new value for the signal.
	 */
	set: (value: T) => void;
	/**
	 * Method to update the signal's value based on its current value.
	 * @param updater A function that takes the current value and returns the new value.
	 */
	update: (updater: (value: T) => T) => void;
	/**
	 * A set of weak references to the effects that depend on this signal.
	 * Used for dependency tracking and automatic updates.
	 */
	_deps: Set<WeakRef<EffectFn>>;
}

/**
 * Represents a function that derives a computed value from other signals or state.
 */
export type ComputedFn<T> = () => T;

/**
 * Represents a function that is executed when its dependencies change.
 */
export interface EffectFn {
	/**
	 * Executes the effect.
	 */
	(): void;
	/**
	 * Indicates whether the effect has run at least once.
	 */
	_hasRun?: boolean;
	/**
	 * An optional name for the effect, useful for debugging.
	 */
	_name?: string;
	/**
	 * An optional priority for the effect, used to determine the order in which effects are executed.
	 */
	_priority?: number;
	/**
	 * Indicates whether the effect has been disposed of.
	 */
	_disposed?: boolean;
	/**
	 * A reference to the original effect function, used for internal tracking.
	 */
	_effect?: EffectFn;
}
