import type { VNode } from "../types";
import { castToString, isVNodeString } from "../utils";
import { propProcessor } from "./props";
import { escapeHTML } from "./utils";

/**
 * Converts an element to its HTML string representation.
 *
 * @param vNode - The element to convert, either an VNode object or a string (text node)
 * @returns The HTML string representation of the element
 */
export function renderStringElement(vNode: VNode | string): string {
	// Handle text nodes
	if (isVNodeString(vNode)) {
		return escapeHTML(String(vNode));
	}
	// Grab what we need from vNode and set defaults
	const { type, props = {}, children } = vNode as VNode;
	// Handle fragments (when type is undefined or null)
	if (!type) {
		return renderChildren(children);
	}
	// Create an array fro pushing strings
	const html: string[] = [];
	// Use the prop processor to handle differnt prop types
	propProcessor(props, {
		classProp(className) {
			// Add className to the HTML string
			html.push(`${type} class="${escapeHTML(className)}"`);
		},
		boolProp(key) {
			// Add boolean attributes to the HTML string
			html.push(`${type} ${key}`);
		},
		regularProp(key, value) {
			// Add regular attributes to the HTML string
			html.push(`${type} ${key}="${escapeHTML(castToString(value))}"`);
		},
		datasetProp(datasetObj) {
			// Process each dataset property and add it to the HTML string
			for (const [key, value] of Object.entries(datasetObj)) {
				// Convert camelCase to kebab-case with data- prefix
				const dataAttr = `data-${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
				html.push(`${type} ${dataAttr}="${escapeHTML(castToString(value))}"`);
			}
		},
	});
	// Generate children content
	html.push(renderChildren(children));
	// Generate closing tag
	html.push(`</${type}>`);
	return html.join("");
}

/**
 * Renders an array of child nodes into an HTML string.
 *
 * @param children - The array of child nodes to render. Defaults to an empty array.
 * @returns A string containing the HTML representation of all child nodes concatenated together.
 *          Returns an empty string if children is falsy or empty.
 */
function renderChildren(children: VNode["children"] = []) {
	// Create an array with predefined length for holding the html strings
	const html = new Array(children.length);
	// Iterate over the children
	for (let i = 0; i < children.length; i++) {
		// Render the string element to the html array in the correct position
		html[i] = renderStringElement(children[i]);
	}
	return html.join("");
}
