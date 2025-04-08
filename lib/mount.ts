import { getDefaultContext } from "./context";
import { diff } from "./diff";
import { cleanupRootEvents } from "./events";
import { batch, effect } from "./reactive";
import type { VNode } from "./types";

/**
 * Mounts a component to the DOM and sets up a reactive system to update it.
 *
 * @param vNodeEffect - A function that returns an VNode to be mounted
 * @param rootSelector - CSS selector for the root element where the component will be mounted, defaults to "#root"
 * @param context - Optional context object (uses default if not provided)
 *
 * @remarks
 * This function creates a reactive binding between the VNode returned by vNodeEffect
 * and the DOM. When dependencies of vNodeEffect change, the component will automatically
 * be re-rendered through the diff algorithm.
 */
export function mount(
	vNodeFn: () => VNode,
	rootSelector = "#root",
	context = getDefaultContext(),
) {
	// Register the root selector in the context's rootStore
	if (!context.dom.rootStore.has(rootSelector)) {
		context.dom.rootStore.set(rootSelector, {
			events: {
				delegates: new Set(),
				handlers: new Map(),
				listeners: new Map(),
			},
		});
	}

	// Create the effect that diffs the component when any signal dependency changes
	const cleanup = effect(() =>
		batch(() => diff(vNodeFn(), rootSelector, context)),
	);

	// Return a cleanup function
	return () => {
		// Clean up the effect
		cleanup();
		// Clean up event delegates
		cleanupRootEvents(rootSelector);
	};
}
