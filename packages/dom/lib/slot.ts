import type { VNode, VNodeProps, VNodeValue } from "./types";

/**
 * Creates a slot function that enables context-like patterns using simple closures.
 * 
 * @param fn - A function that receives props and children and returns a VNode
 * @returns A higher-order function that takes a node and returns a closure
 * 
 * @example
 * ```tsx
 * const slot = (fn) => (node) => {
 *   const props = { ...node }
 *   delete props.children;
 *   return () => fn(props, [...node.children]);
 * }
 * 
 * const Provider = slot((props, children) => ({
 *   tag: "div",
 *   props,
 *   children
 * }));
 * 
 * const app = Provider({ class: "container", children: ["Hello World"] });
 * ```
 */
export const slot = <T extends Record<string, unknown>>(
	fn: (props: T, children: VNodeValue[]) => VNode
) => (node: T & { children?: VNodeValue[] }) => {
	const props = { ...node } as T;
	delete (props as any).children;
	const children = node.children || [];
	return () => fn(props, children);
};