import type { VNode, VNodeValue } from "./types";

export const slot = <T extends Record<string, unknown>>(
	fn: (props: T, children: VNodeValue[]) => VNode
) => {
	const component = (node: T & { children?: VNodeValue[] }) => {
		const props = { ...node } as T;
		delete (props as any).children;
		const children = node.children || [];
		return fn(props, children);
	};
	return component;
};