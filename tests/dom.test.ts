import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { type VNode, cleanupRootEvents, context, diff, render } from "../lib";

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
	return document.getElementById(id);
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
			expect(container?.childNodes.length).toBe(1);
			const div = container?.childNodes[0] as HTMLElement;
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
			const div = container?.childNodes[0] as HTMLElement;
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
			expect(container?.childNodes.length).toBe(2);
			expect((container?.childNodes[0] as HTMLElement).textContent).toBe(
				"First",
			);
			expect((container?.childNodes[1] as HTMLElement).textContent).toBe(
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
			const div = container?.childNodes[0] as HTMLElement;
			expect(div.textContent).toBe("Updated Text");
		});

		test("updates attributes", () => {
			// Initial render
			const vNode1: VNode = {
				type: "div",
				props: { className: "initial", id: "test-id" },
			};
			render(vNode1, "#test-container");

			// Update
			const vNode2: VNode = {
				type: "div",
				props: { className: "updated", dataset: { test: "value" } },
			};
			diff(vNode2, "#test-container");

			const container = getContainer();
			const div = container?.childNodes[0] as HTMLElement;
			expect(div.className).toBe("updated");
			expect(div.id).toBe(""); // id should be removed
			expect(div.dataset.test).toBe("value"); // data-test should be added
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
			const div = container?.childNodes[0] as HTMLElement;
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
			const div = container?.childNodes[0] as HTMLElement;
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
			const div = container?.childNodes[0] as HTMLElement;
			const p = div.childNodes[0] as HTMLElement;
			expect(p.tagName).toBe("P");
			expect(p.textContent).toBe("Text");
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
			const button = container?.childNodes[0] as HTMLButtonElement;

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
			expect(container?.childNodes.length).toBe(2);
			expect(container?.childNodes[0].textContent).toBe("Text Node");
			expect((container?.childNodes[1] as HTMLElement).textContent).toBe(
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
			expect(container?.childNodes.length).toBe(3);
			expect((container?.childNodes[0] as HTMLElement).textContent).toBe(
				"First Updated",
			);
			expect((container?.childNodes[1] as HTMLElement).textContent).toBe(
				"Second Updated",
			);
			expect((container?.childNodes[2] as HTMLElement).textContent).toBe(
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
			const div = container?.childNodes[0] as HTMLElement;

			// Initial state
			expect(div.textContent).toBe("Count: 40");
		});
	});
});
