import { cleanupRootEvents } from "../events";
import type { Context, EffectFn } from "../types";
import { NOT_TRACKING, unsubscribeDependencies } from "../utils";
import { CONTEXT_STORE } from "./store";

const allEffects = new Set<EffectFn>();

/**
 * Performs a complete cleanup of a context, disposing all associated effects and resources.
 *
 * This function:
 * 1. Disposes all reactive effects by either calling cleanup functions or marking observers as disposed
 * 2. Clears all internal reactive state (pending notifications, registry, execution context, etc.)
 * 3. Cleans up all DOM event listeners attached to root elements
 * 4. Removes the context from the global context store
 *
 * @param context - The context object to clean up
 */
export function cleanupContext(context: Context) {
	const { reactive, dom, id } = context;
	const {
		effectDependencies,
		pendingNotifications,
		pendingRegistry,
		executionContext,
	} = reactive;

	allEffects.clear();

	for (const effect of effectDependencies.keys()) {
		allEffects.add(effect);
	}

	for (const effect of pendingNotifications) {
		allEffects.add(effect);
	}

	for (const effect of allEffects) {
		if (!effect._disposed) {
			if (effect._effect) {
				// This is a cleanup function, call it
				effect();
			} else {
				// This is an observer function, mark it as disposed
				effect._disposed = true;
				unsubscribeDependencies(effect, reactive);
			}
		}
	}

	pendingNotifications.length = 0;
	executionContext.length = 0;
	pendingRegistry.clear();
	effectDependencies.clear();
	// Direct assignment
	reactive.activeTracker = NOT_TRACKING;
	reactive.batchDepth = 0;
	reactive.currentExecutingEffect = null;

	// Clean up DOM events
	for (const [selector, _] of dom.rootStore.entries()) {
		cleanupRootEvents(selector);
	}

	dom.rootStore.clear();

	// Remove from global store
	CONTEXT_STORE.delete(id);
}
