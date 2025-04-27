import { List } from "./list";
import { computed, effect, signal } from "./signal";
import type { VNode, VNodeFlatFn } from "./types";

/**
 * Conditionally renders a virtual node.
 * This function provides a way to manage conditional rendering based on reactive state.
 *
 * @param vNodeFn - Function that returns a virtual DOM node to be conditionally rendered
 * @returns A function with _flatten property that evaluates to the result of vNodeFn
 */
export function Slot(vNodeFn: () => VNode): VNodeFlatFn {
	const sig = signal([vNodeFn()]);
	const comp = computed(() => vNodeFn());
	comp.subscribe((value) => {
		sig.set([value])
	});
	return List({ items: sig, comp }).map(() => vNodeFn());
}
