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
	args?:
		| {
				root?: string;
				context?: ReturnType<typeof getDefaultContext>;
				onBeforeMount?(): void;
				onMounted?(): void;
				onBeforeUpdate?(): void;
				onUpdated?(): void;
				onBeforeUnmount?(): void;
				onUnmounted?(): void;
		  }
		| string,
) {
	let options = args;

	if (typeof options === "string") {
		options = { root: options };
	}

	const {
		root = "#root",
		context = getDefaultContext(),
		onBeforeMount,
		onMounted,
		onBeforeUpdate,
		onUpdated,
		onBeforeUnmount,
		onUnmounted,
	} = options || {};

	// Register the root selector in the context's rootStore
	if (!context.dom.rootStore.has(root)) {
		context.dom.rootStore.set(root, {
			events: {
				delegates: new Set(),
				handlers: new Map(),
				listeners: new Map(),
			},
		});
	}

	onBeforeMount?.();

	// Create the effect that diffs the component when any signal dependency changes
	let isFirstRender = true;

	const cleanup = effect(() => {
		if (!isFirstRender) {
			onBeforeUpdate?.();
		}

		const result = batch(() => diff(vNodeFn(), root, context));

		if (isFirstRender) {
			onMounted?.();
			isFirstRender = false;
		} else {
			onUpdated?.();
		}
	});

	return () => {
		onBeforeUnmount?.();

		cleanup(); // Clean up the effect

		cleanupRootEvents(root);

		onUnmounted?.();
	};
}
