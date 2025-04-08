import type { Context, VNodeBase } from "../types";
import { renderElement } from "./element";

export function renderFragment(
	children: (string | Partial<VNodeBase>)[],
	rootSelector: string,
	context: Context,
) {
	const fragment = document.createDocumentFragment();
	// Count the number of children in the existing fragment
	const childLen = children.length;
	// Render each child to the fragment
	for (let i = 0; i < childLen; i++) {
		fragment.appendChild(renderElement(children[i], rootSelector, context));
	}
	return fragment;
}
