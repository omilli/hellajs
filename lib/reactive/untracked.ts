import { getDefaultContext } from "../context";
import { NOT_TRACKING, setActiveTracker } from "../utils";
/**
 * Executes a function without tracking dependencies.
 *
 * This function temporarily disables dependency tracking within the provided function,
 * ensuring that any reactive reads performed during its execution are not recorded.
 * After the function completes (or throws), the previous tracking state is restored.
 *
 * @template T The return type of the function.
 * @param {() => T} fn The function to execute without tracking dependencies.
 * @returns The result of the function execution.
 */
export function untracked<T>(
	fn: () => T,
	{ reactive } = getDefaultContext(),
): T {
	const prevEffect = reactive.activeTracker;
	// Mark as not tracking during execution
	setActiveTracker(reactive, NOT_TRACKING);
	try {
		return fn();
	} finally {
		// Make sure we restore the previous state
		setActiveTracker(reactive, prevEffect);
	}
}
