import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
	type HTMLTagName,
	type VNode,
	cleanupRootEvents,
	context,
	diff,
	diffNode,
	html,
	mount,
	render,
	signal,
} from "../lib";

// Helper functions for testing
function createContainer(id = "test-container") {
	const container = document.createElement("div");
	container.id = id;
	document.body.appendChild(container);
	return container;
}

function removeContainer(id = "test-container") {
	const container = document.getElementById(id);
	if (container) {
		document.body.removeChild(container);
	}
}

function getContainer(id = "test-container") {
	// biome-ignore lint/style/noNonNullAssertion:
	return document.getElementById(id)!;
}

describe("DOM Rendering and Diffing", () => {
	beforeEach(() => {
		createContainer();
	});

	afterEach(() => {
		removeContainer();
	});

	describe("Basic Rendering", () => {
		test("renders a simple element", () => {
			const vNode: VNode = {
				type: "div",
				props: { className: "test" },
				children: ["Hello World"],
			};
			render(vNode, "#test-container");

			const container = getContainer();
			expect(container.childNodes.length).toBe(1);
			const div = container.childNodes[0] as HTMLElement;
			expect(div.tagName).toBe("DIV");
			expect(div.className).toBe("test");
			expect(div.textContent).toBe("Hello World");
		});

		test("renders nested elements", () => {
			const vNode: VNode = {
				type: "div",
				props: { className: "parent" },
				children: [
					{
						type: "span",
						props: { className: "child" },
						children: ["Child Text"],
					},
				],
			};

			render(vNode, "#test-container");

			const container = getContainer();
			const div = container.childNodes[0] as HTMLElement;
			expect(div.tagName).toBe("DIV");
			expect(div.className).toBe("parent");

			const span = div.childNodes[0] as HTMLElement;
			expect(span.tagName).toBe("SPAN");
			expect(span.className).toBe("child");
			expect(span.textContent).toBe("Child Text");
		});

		test("renders fragments", () => {
			const vNode: VNode = {
				children: [
					{ type: "div", children: ["First"] },
					{ type: "div", children: ["Second"] },
				],
			};

			render(vNode, "#test-container");

			const container = getContainer();
			expect(container.childNodes.length).toBe(2);
			expect((container.childNodes[0] as HTMLElement).textContent).toBe(
				"First",
			);
			expect((container.childNodes[1] as HTMLElement).textContent).toBe(
				"Second",
			);
		});
	});

	describe("Diffing and Updating", () => {
		test("updates text content", () => {
			// Initial render
			const vNode1: VNode = { type: "div", children: ["Initial Text"] };
			render(vNode1, "#test-container");

			// Update
			const vNode2: VNode = { type: "div", children: ["Updated Text"] };
			diff(vNode2, "#test-container");

			const container = getContainer();
			const div = container.childNodes[0] as HTMLElement;
			expect(div.textContent).toBe("Updated Text");
		});

		test("updates attributes", () => {
			// Initial render
			const vNode1: VNode<"input"> = {
				type: "input",
				props: { className: "initial", id: "test-id", disabled: true },
			};
			render(vNode1, "#test-container");

			// Update
			const vNode2: VNode<"input"> = {
				type: "input",
				props: {
					className: "updated",
					id: "testing-id",
					disabled: true,
					dataset: { test: "value" },
				},
			};
			diff(vNode2, "#test-container");

			const container = getContainer();
			const input = container.childNodes[0] as HTMLInputElement;
			expect(input.className).toBe("updated");
			expect(input.id).toBe("testing-id");
			expect(input.dataset.test).toBe("value");
			expect(input.disabled).toBe(true);
		});

		test("updates fragments", () => {
			// Create a DocumentFragment
			const fragment = document.createDocumentFragment();
			fragment.appendChild(document.createElement("div"));

			// Create a fragment VNode to diff against
			const fragmentVNode = {
				children: [{ type: "span", children: ["Updated content"] }],
			};

			// Create a parent for replacement operations
			const parent = document.createElement("div");
			parent.appendChild(fragment);

			// Call diffNode directly with the fragment
			const ctx = context("test");
			const result = diffNode(
				fragment,
				fragmentVNode as unknown as HTMLTagName,
				parent,
				"#test",
				ctx,
			);

			// Verify fragment was updated not replaced
			expect(result).toBe(fragment);
			expect(fragment.childNodes.length).toBe(1);
			expect((fragment.childNodes[0] as HTMLElement).tagName).toBe("SPAN");
		});

		test("adds new elements", () => {
			// Initial render
			const vNode1: VNode = {
				type: "div",
				children: [{ type: "span", children: ["First"] }],
			};
			render(vNode1, "#test-container");

			// Update with additional element
			const vNode2: VNode = {
				type: "div",
				children: [
					{ type: "span", children: ["First"] },
					{ type: "span", children: ["Second"] },
				],
			};
			diff(vNode2, "#test-container");

			const container = getContainer();
			const div = container.childNodes[0] as HTMLElement;
			expect(div.childNodes.length).toBe(2);
			expect((div.childNodes[0] as HTMLElement).textContent).toBe("First");
			expect((div.childNodes[1] as HTMLElement).textContent).toBe("Second");
		});

		test("removes elements", () => {
			// Initial render with two children
			const vNode1: VNode = {
				type: "div",
				children: [
					{ type: "span", children: ["First"] },
					{ type: "span", children: ["Second"] },
				],
			};
			render(vNode1, "#test-container");

			// Update with one child removed
			const vNode2: VNode = {
				type: "div",
				children: [{ type: "span", children: ["First"] }],
			};
			diff(vNode2, "#test-container");

			const container = getContainer();
			const div = container.childNodes[0] as HTMLElement;
			expect(div.childNodes.length).toBe(1);
			expect((div.childNodes[0] as HTMLElement).textContent).toBe("First");
		});

		test("replaces elements of different types", () => {
			// Initial render with span
			const vNode1: VNode = {
				type: "div",
				children: [{ type: "span", children: ["Text"] }],
			};
			render(vNode1, "#test-container");

			// Update replacing span with p
			const vNode2: VNode = {
				type: "div",
				children: [{ type: "p", children: ["Text"] }],
			};
			diff(vNode2, "#test-container");

			const container = getContainer();
			const div = container.childNodes[0] as HTMLElement;
			const p = div.childNodes[0] as HTMLElement;
			expect(p.tagName).toBe("P");
			expect(p.textContent).toBe("Text");
		});

		test("replaces an element with a text node", () => {
			// Initial render with an element
			const vNode1: VNode = {
				type: "div",
				children: [{ type: "span", children: ["Initial Element"] }],
			};
			render(vNode1, "#test-container");

			// Verify initial element is rendered
			const container = getContainer();
			expect(container.childNodes.length).toBe(1);
			const div = container.childNodes[0] as HTMLElement;
			expect(div.tagName).toBe("DIV");
			expect(div.childNodes[0].nodeName).toBe("SPAN");

			// Now replace the span with plain text
			const vNode2: VNode = {
				type: "div",
				children: ["Just Text Now"], // Direct text node instead of element
			};
			diff(vNode2, "#test-container");

			// Verify the span was replaced with a text node
			const updatedDiv = getContainer().childNodes[0] as HTMLElement;
			expect(updatedDiv.childNodes.length).toBe(1);
			expect(updatedDiv.childNodes[0].nodeType).toBe(3); // Text node
			expect(updatedDiv.textContent).toBe("Just Text Now");
		});
	});

	describe("Event Handling", () => {
		test("attaches event handlers", () => {
			let clicked = false;

			const vNode: VNode = {
				type: "button",
				props: {
					onclick: () => {
						clicked = true;
					},
				},
				children: ["Click Me"],
			};

			render(vNode, "#test-container");

			const container = getContainer();
			const button = container.childNodes[0] as HTMLButtonElement;

			// Simulate click
			button.click();

			expect(clicked).toBe(true);

			// Run event cleanup
			cleanupRootEvents("#test-container");
		});

		test("updates event handlers", () => {
			let counter = 0;

			// Initial handler (skip manual button creation)
			const vNode1: VNode = {
				type: "button",
				props: {
					onclick: () => {
						counter = 1;
					},
				},
				children: ["Click Me"],
			};
			diff(vNode1, "#test-container");

			// Click to verify initial handler works
			const container1 = getContainer();
			const button1 = container1?.childNodes[0] as HTMLButtonElement;
			button1.click();
			expect(counter).toBe(1);

			// Updated handler
			const vNode2: VNode = {
				type: "button",
				props: {
					onclick: () => {
						counter = 2;
					},
				},
				children: ["Click Me"],
			};
			diff(vNode2, "#test-container");

			// Simulate click with updated handler
			const container2 = getContainer();
			const button2 = container2?.childNodes[0] as HTMLButtonElement;
			button2.click();
			expect(counter).toBe(2);

			// Run event cleanup
			cleanupRootEvents("#test-container");
		});
	});

	describe("Fragment Handling", () => {
		test("renders fragment children", () => {
			const vNode: VNode = {
				children: ["Text Node", { type: "div", children: ["Element Node"] }],
			};

			render(vNode, "#test-container");

			const container = getContainer();
			expect(container.childNodes.length).toBe(2);
			expect(container.childNodes[0].textContent).toBe("Text Node");
			expect((container.childNodes[1] as HTMLElement).textContent).toBe(
				"Element Node",
			);
		});

		test("updates fragment children", () => {
			// Initial fragment render
			const vNode1: VNode = {
				children: [
					{ type: "div", children: ["First"] },
					{ type: "div", children: ["Second"] },
				],
			};
			render(vNode1, "#test-container");

			// Update fragment
			const vNode2: VNode = {
				children: [
					{ type: "div", children: ["First Updated"] },
					{ type: "div", children: ["Second Updated"] },
					{ type: "div", children: ["Third (New)"] },
				],
			};
			diff(vNode2, "#test-container");

			const container = getContainer();
			expect(container.childNodes.length).toBe(3);
			expect((container.childNodes[0] as HTMLElement).textContent).toBe(
				"First Updated",
			);
			expect((container.childNodes[1] as HTMLElement).textContent).toBe(
				"Second Updated",
			);
			expect((container.childNodes[2] as HTMLElement).textContent).toBe(
				"Third (New)",
			);
		});
	});

	describe("Context-specific Rendering", () => {
		test("renders with context", () => {
			const ctx = context("custom");
			const count = ctx.signal(40);

			const renderCount = `Count: ${count()}`;

			const vNode: VNode = {
				type: "div",
				children: [renderCount],
			};

			ctx.render(vNode, "#test-container");

			const container = getContainer();
			const div = container.childNodes[0] as HTMLElement;

			// Initial state
			expect(div.textContent).toBe("Count: 40");
		});
	});

	describe("HTML Element Factory", () => {
		beforeEach(() => {
			createContainer();
		});

		afterEach(() => {
			removeContainer();
		});

		describe("Fragment Creation", () => {
			test("creates fragments with string and number children", () => {
				const fragment = html.$("Text Node", 42, "Another Text");

				render(fragment, "#test-container");

				const container = getContainer();
				expect(container.childNodes.length).toBe(3);
				expect(container.childNodes[0].textContent).toBe("Text Node");
				expect(container.childNodes[1].textContent).toBe("42");
				expect(container.childNodes[2].textContent).toBe("Another Text");
			});

			test("creates fragments with nested arrays", () => {
				const fragment = html.$(
					...["Item 1", "Item 2"],
					...[...["Nested Item"]],
				);

				render(fragment, "#test-container");

				const container = getContainer();
				expect(container.childNodes.length).toBe(3);
				expect(container.childNodes[0].textContent).toBe("Item 1");
				expect(container.childNodes[1].textContent).toBe("Item 2");
				expect(container.childNodes[2].textContent).toBe("Nested Item");
			});

			test("creates fragments with mixed VNode and primitive values", () => {
				const fragment = html.$(
					html.span("Span Element"),
					"Text Node",
					html.div("Div Element"),
				);

				render(fragment, "#test-container");

				const container = getContainer();
				expect(container.childNodes.length).toBe(3);
				expect((container.childNodes[0] as HTMLElement).tagName).toBe("SPAN");
				expect(container.childNodes[1].nodeType).toBe(3); // Text node
				expect((container.childNodes[2] as HTMLElement).tagName).toBe("DIV");
			});
		});

		describe("Proxy Handler", () => {
			test("returns existing cached element factory", () => {
				// First access creates and caches
				const div1 = html.div;
				// Second access should retrieve from cache
				const div2 = html.div;

				expect(div1).toBe(div2);
			});

			test("handles non-string property access", () => {
				const sym = Symbol("test");
				// @ts-ignore - Testing edge case
				const result = html[sym];

				expect(result).toBeUndefined();
			});

			test("handles property names starting with __", () => {
				// @ts-ignore - Testing edge case
				const result = html.__privateField;

				expect(result).toBeUndefined();
			});
		});

		describe("Element Creation without Props", () => {
			test("creates element with only children (no props)", () => {
				const div = html.div("Text Child", html.span("Nested Span"));

				render(div, "#test-container");

				const container = getContainer();
				const divElem = container.childNodes[0] as HTMLElement;

				expect(divElem.tagName).toBe("DIV");
				expect(divElem.childNodes.length).toBe(2);
				expect(divElem.childNodes[0].nodeType).toBe(3); // Text node
				expect((divElem.childNodes[1] as HTMLElement).tagName).toBe("SPAN");
			});

			test("creates element with flattened array children", () => {
				const list = html.ul(
					...["Item 1", "Item 2"].map((item) => html.li(item)),
				);

				render(list, "#test-container");

				const container = getContainer();
				const ul = container.childNodes[0] as HTMLElement;

				expect(ul.tagName).toBe("UL");
				expect(ul.childNodes.length).toBe(2);
				expect((ul.childNodes[0] as HTMLElement).tagName).toBe("LI");
				expect((ul.childNodes[1] as HTMLElement).tagName).toBe("LI");
			});

			test("creates element with deeply nested arrays", () => {
				const div = html.div(
					...[...[...["Deeply"], "Nested"], ...[...[html.strong("Content")]]],
				);

				render(div, "#test-container");

				const container = getContainer();
				const divElem = container.childNodes[0] as HTMLElement;

				expect(divElem.childNodes.length).toBe(3);
				expect(divElem.childNodes[0].textContent).toBe("Deeply");
				expect(divElem.childNodes[1].textContent).toBe("Nested");
				expect((divElem.childNodes[2] as HTMLElement).tagName).toBe("STRONG");
			});
		});
	});

	describe("Component Lifecycle", () => {
		beforeEach(() => {
			createContainer();
		});

		afterEach(() => {
			removeContainer();
		});

		test("basic lifecycle hooks are called in correct order", () => {
			const onBeforeMount = mock(() => {});
			const onMounted = mock(() => {});
			const onBeforeUnmount = mock(() => {});
			const onUnmounted = mock(() => {});

			const unmount = mount(() => html.div("Hello World"), {
				root: "#test-container",
				onBeforeMount,
				onMounted,
				onBeforeUnmount,
				onUnmounted,
			});

			expect(onBeforeMount).toHaveBeenCalledTimes(1);
			expect(onMounted).toHaveBeenCalledTimes(1);
			expect(onBeforeUnmount).toHaveBeenCalledTimes(0);
			expect(onUnmounted).toHaveBeenCalledTimes(0);

			// Unmount the component
			unmount();

			expect(onBeforeUnmount).toHaveBeenCalledTimes(1);
			expect(onUnmounted).toHaveBeenCalledTimes(1);
		});

		test("update lifecycle hooks are called on reactive updates", () => {
			const count = signal(0);

			const onBeforeMount = mock(() => {});
			const onMounted = mock(() => {});
			const onBeforeUpdate = mock(() => {});
			const onUpdated = mock(() => {});

			const unmount = mount(() => html.div(`Count: ${count()}`), {
				root: "#test-container",
				onBeforeMount,
				onMounted,
				onBeforeUpdate,
				onUpdated,
			});

			// Initial render
			expect(onBeforeMount).toHaveBeenCalledTimes(1);
			expect(onMounted).toHaveBeenCalledTimes(1);
			expect(onBeforeUpdate).toHaveBeenCalledTimes(0);
			expect(onUpdated).toHaveBeenCalledTimes(0);

			// Trigger an update
			count.set(1);

			// Update hooks should be called
			expect(onBeforeUpdate).toHaveBeenCalledTimes(1);
			expect(onUpdated).toHaveBeenCalledTimes(1);

			// But not mount hooks again
			expect(onBeforeMount).toHaveBeenCalledTimes(1);
			expect(onMounted).toHaveBeenCalledTimes(1);

			// Cleanup
			unmount();
		});

		test("string selector argument works with lifecycle hooks", () => {
			const onMounted = mock(() => {});

			const unmount = mount(
				() => html.div("Hello World"),
				"#test-container", // Using string shorthand
			);

			// Verify string argument was processed correctly
			const container = document.getElementById("test-container");
			expect(container?.firstChild?.textContent).toBe("Hello World");

			unmount();
		});

		test("lifecycle hooks are called in correct sequence through component lifecycle", () => {
			const count = signal(0);
			const callSequence: string[] = [];

			const unmount = mount(() => html.div(`Count: ${count()}`), {
				root: "#test-container",
				onBeforeMount: () => callSequence.push("beforeMount"),
				onMounted: () => callSequence.push("mounted"),
				onBeforeUpdate: () => callSequence.push("beforeUpdate"),
				onUpdated: () => callSequence.push("updated"),
				onBeforeUnmount: () => callSequence.push("beforeUnmount"),
				onUnmounted: () => callSequence.push("unmounted"),
			});

			// Check initial mount sequence
			expect(callSequence).toEqual(["beforeMount", "mounted"]);

			// Update component
			count.set(1);
			expect(callSequence).toEqual([
				"beforeMount",
				"mounted",
				"beforeUpdate",
				"updated",
			]);

			// Update again
			count.set(2);
			expect(callSequence).toEqual([
				"beforeMount",
				"mounted",
				"beforeUpdate",
				"updated",
				"beforeUpdate",
				"updated",
			]);

			// Unmount
			unmount();
			expect(callSequence).toEqual([
				"beforeMount",
				"mounted",
				"beforeUpdate",
				"updated",
				"beforeUpdate",
				"updated",
				"beforeUnmount",
				"unmounted",
			]);
		});
	});
});
