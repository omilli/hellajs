import { diff } from "../diff";
import {
	NOT_TRACKING,
	batch,
	computed,
	effect,
	signal,
	untracked,
} from "../reactive";
import { render } from "../render";
import type { Context } from "../types";
import { generateKey } from "../utils";
import { cleanupContext } from "./cleanup";
import { CONTEXT_STORE } from "./store";

/**
 * Context is the central container for managing reactive state and DOM operations.
 * It provides methods for creating and managing signals, effects, computed values,
 * and rendering to the DOM.
 *
 * @param id - Optional ID for new context. If not provided, a unique ID will be generated.
 * @returns A new Context object with initialized reactive state management and DOM utilities.
 *
 */
export function context(id = `hellaContext${generateKey()}`): Context {
	const contextState: Context = {
		id,
		signal: (...args) => signal(...args, contextState),
		effect: (...args) => effect(...args, contextState),
		computed: (fn) => computed(fn),
		batch: (fn) => batch(fn, contextState),
		untracked: (fn) => untracked(fn, contextState),
		render: (...args) => render(...args, contextState),
		diff: (...args) => diff(...args, contextState),
		cleanup: () => cleanupContext(contextState),
		dom: {
			rootStore: new Map(),
		},
		reactive: {
			activeTracker: NOT_TRACKING,
			pendingNotifications: [],
			pendingRegistry: new Set(),
			executionContext: [],
			effectDependencies: new Map(),
			batchDepth: 0,
			currentExecutingEffect: null,
			parentChildEffectsMap: new WeakMap(),
		},
	};

	CONTEXT_STORE.set(id, contextState);

	return contextState;
}
