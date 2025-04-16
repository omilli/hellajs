import { describe, expect, test } from "bun:test";
import {
	type GlobalContext,
	context,
	effect,
	getDefaultContext,
	getGlobalThis,
	html,
	mount,
	signal,
} from "../lib";
import { CONTEXT_STORE } from "../lib/context/store";
import { flushMicrotasks } from "./flush";

describe("Context", () => {
	describe("Basic Functionality", () => {
		test("creates a context with custom ID", () => {
			const ctx = context("test-context");
			expect(ctx.id).toBe("test-context");
		});

		test("creates a context with auto-generated ID when none provided", () => {
			const ctx = context();
			expect(ctx.id).toBeDefined();
			expect(typeof ctx.id).toBe("string");
			expect(ctx.id.startsWith("hellaContext")).toBe(true);
		});

		test("default context is accessible", () => {
			const defaultCtx = getDefaultContext();
			expect(defaultCtx).toBeDefined();
			expect(defaultCtx.id).toBe("hellaDefaultContext");
		});

		test("context provides all required reactive primitives", () => {
			const ctx = context("test");
			expect(typeof ctx.signal).toBe("function");
			expect(typeof ctx.effect).toBe("function");
			expect(typeof ctx.computed).toBe("function");
			expect(typeof ctx.batch).toBe("function");
			expect(typeof ctx.untracked).toBe("function");
			expect(typeof ctx.render).toBe("function");
			expect(typeof ctx.diff).toBe("function");
		});

		test("getGlobalThis correctly identifies global object across environments", () => {
			// Import the function directly for testing
			// Save original globals
			const originalGlobalThis = globalThis;

			// Test case 1: Modern environments with globalThis
			expect(getGlobalThis()).toBe(originalGlobalThis as GlobalContext);

			// Test case 2: Browser environment (window)
			// @ts-ignore - Temporarily modify for testing
			// biome-ignore lint/suspicious/noGlobalAssign:
			globalThis = undefined;
			// @ts-ignore - Mock window
			global.window = { mockWindowProperty: true };
			expect(getGlobalThis()).toBe(window as GlobalContext);

			// Test case 3: Node.js environment (global)
			// @ts-ignore - Temporarily modify for testing
			global.window = undefined;
			// Mock a Node.js-like global
			const mockGlobal = {
				mockGlobalProperty: true,
			} as unknown as GlobalContext;
			// @ts-ignore
			global.global = mockGlobal;
			expect(getGlobalThis()).toBe(mockGlobal);

			// Restore original globals after test
			// @ts-ignore
			// biome-ignore lint/suspicious/noGlobalAssign:
			globalThis = originalGlobalThis;
		});
	});

	describe("Isolation", () => {
		test("signals in different contexts are isolated", () => {
			const ctx1 = context("ctx1");
			const ctx2 = context("ctx2");

			const count1 = ctx1.signal(0);
			const count2 = ctx2.signal(0);

			// Update one signal
			count1.set(10);

			// Each signal has its own state
			expect(count1()).toBe(10);
			expect(count2()).toBe(0);

			// Update the other signal
			count2.set(20);

			// Verify isolation
			expect(count1()).toBe(10);
			expect(count2()).toBe(20);
		});

		test("effects in different contexts are isolated", () => {
			const ctx1 = context("ctx1");
			const ctx2 = context("ctx2");

			const count1 = ctx1.signal(0);
			const count2 = ctx2.signal(0);

			let effect1Runs = 0;
			let effect2Runs = 0;

			// Create effects in each context
			ctx1.effect(() => {
				count1();
				effect1Runs++;
			});

			ctx2.effect(() => {
				count2();
				effect2Runs++;
			});

			// Initial effect runs
			expect(effect1Runs).toBe(1);
			expect(effect2Runs).toBe(1);

			// Update signal in first context
			count1.set(10);

			// Only effect1 should run again
			expect(effect1Runs).toBe(2);
			expect(effect2Runs).toBe(1);

			// Update signal in second context
			count2.set(20);

			// Now effect2 should run again
			expect(effect1Runs).toBe(2);
			expect(effect2Runs).toBe(2);
		});

		test("computed values in different contexts are isolated", () => {
			const ctx1 = context("ctx1");
			const ctx2 = context("ctx2");

			const count1 = ctx1.signal(1);
			const count2 = ctx2.signal(2);

			let compute1Runs = 0;
			let compute2Runs = 0;

			const doubled1 = ctx1.computed(() => {
				compute1Runs++;
				return count1() * 2;
			});

			const doubled2 = ctx2.computed(() => {
				compute2Runs++;
				return count2() * 2;
			});

			// Initial computed values
			expect(doubled1()).toBe(2);
			expect(doubled2()).toBe(4);
			expect(compute1Runs).toBe(1);
			expect(compute2Runs).toBe(1);

			// Update signal in first context
			count1.set(5);

			// Only computed1 should recalculate
			expect(doubled1()).toBe(10);
			expect(doubled2()).toBe(4);
			expect(compute1Runs).toBe(2);
			expect(compute2Runs).toBe(1);

			// Update signal in second context
			count2.set(10);

			// Now computed2 should recalculate
			expect(doubled1()).toBe(10);
			expect(doubled2()).toBe(20);
			expect(compute1Runs).toBe(2);
			expect(compute2Runs).toBe(2);
		});

		test("batching is isolated by context", async () => {
			const ctx1 = context("ctx1");
			const ctx2 = context("ctx2");

			const count1 = ctx1.signal(0);
			const count2 = ctx2.signal(0);

			let effect1Runs = 0;
			let effect2Runs = 0;

			ctx1.effect(() => {
				count1();
				effect1Runs++;
			});

			ctx2.effect(() => {
				count2();
				effect2Runs++;
			});

			// Initial runs
			expect(effect1Runs).toBe(1);
			expect(effect2Runs).toBe(1);

			// Batch update in context 1
			ctx1.batch(() => {
				count1.set(1);
				count1.set(2);
				count1.set(3);
			});

			await flushMicrotasks();

			// Only context 1 effect should run again
			expect(effect1Runs).toBe(2);
			expect(effect2Runs).toBe(1);
			expect(count1()).toBe(3);

			// Batch update in context 2
			ctx2.batch(() => {
				count2.set(1);
				count2.set(2);
				count2.set(3);
			});

			await flushMicrotasks();

			// Now context 2 effect should run again
			expect(effect1Runs).toBe(2);
			expect(effect2Runs).toBe(2);
			expect(count2()).toBe(3);
		});

		test("untracked is isolated by context", () => {
			const ctx1 = context("ctx1");
			const ctx2 = context("ctx2");

			const count1 = ctx1.signal(0);
			const count2 = ctx2.signal(0);

			let effect1Runs = 0;
			let effect2Runs = 0;

			ctx1.effect(() => {
				ctx1.untracked(() => count1());
				effect1Runs++;
			});

			ctx2.effect(() => {
				count2(); // tracked normally
				effect2Runs++;
			});

			// Initial runs
			expect(effect1Runs).toBe(1);
			expect(effect2Runs).toBe(1);

			// Update count1 - should not trigger effect1 because it's untracked
			count1.set(10);
			expect(effect1Runs).toBe(1);

			// Update count2 - should trigger effect2
			count2.set(20);
			expect(effect2Runs).toBe(2);
		});
	});

	describe("Inter-context Behavior", () => {
		test("signals from one context can be read from another context", () => {
			const ctx1 = context("ctx1");
			const ctx2 = context("ctx2");

			// Create a signal in context 1
			const count = ctx1.signal(10);

			// Read it from context 2
			let effectRuns = 0;
			ctx2.effect(() => {
				count(); // accessing signal from ctx1
				effectRuns++;
			});

			// Initial run
			expect(effectRuns).toBe(1);

			// Updates to signal from ctx1 affect effect in ctx2
			count.set(20);
			expect(effectRuns).toBe(2);
		});

		test("global signals can be accessed from context-specific effects", () => {
			const ctx = context("local-ctx");

			// Create a global signal
			const globalCount = signal(0);

			// Create a local context effect that uses it
			let effectRuns = 0;
			ctx.effect(() => {
				globalCount();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Update the global signal
			globalCount.set(10);

			// The local context effect should run
			expect(effectRuns).toBe(2);
		});

		test("context-specific signals can be accessed from global effects", () => {
			const ctx = context("local-ctx");

			// Create a context-specific signal
			const localCount = ctx.signal(0);

			// Create a global effect that uses it
			let effectRuns = 0;
			effect(() => {
				localCount();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Update the local signal
			localCount.set(10);

			// The global effect should run
			expect(effectRuns).toBe(2);
		});
	});

	describe("Context Cleanup", () => {
		test("cleanup properly disposes effects", () => {
			const ctx = context("cleanup-test");
			const count = ctx.signal(0);

			let effectRuns = 0;
			ctx.effect(() => {
				count();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Trigger the effect
			count.set(1);
			expect(effectRuns).toBe(2);

			// Clean up the context
			ctx.cleanup();

			// Effect should no longer run after cleanup
			count.set(2);
			expect(effectRuns).toBe(2);
		});

		test("cleanup properly disposes pending notifications", async () => {
			const ctx = context("pending-cleanup-test");
			const count = ctx.signal(0);
			let effectRuns = 0;

			// Create an effect that tracks count
			ctx.effect(() => {
				count();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Queue updates without allowing effects to run yet
			ctx.batch(() => {
				count.set(1);

				// Clean up context while updates are still pending
				ctx.cleanup();

				// Try another update to ensure it's ignored
				count.set(2);
			});

			// Let microtasks flush - effects should not run
			await flushMicrotasks();

			// Verify the effect didn't run despite the queued updates
			expect(effectRuns).toBe(1);
		});

		test("cleanup removes the context from the store", () => {
			const id = "cleanup-store-test";
			const ctx = context(id);

			expect(CONTEXT_STORE.has(id)).toBe(true);

			ctx.cleanup();

			expect(CONTEXT_STORE.has(id)).toBe(false);
		});

		test("cleanup cleans up DOM events", () => {
			const ctx = context("cleanup-dom-test");
			const mockElement = document.createElement("div");
			mockElement.id = "test-root";
			document.body.appendChild(mockElement);

			// Create a component with event handlers
			const App = () =>
				html.div(
					{
						onclick: () => console.log("clicked"),
					},
					"Test",
				);

			const unmount = mount(App, { root: "#test-root", context: ctx });

			// Verify the root context was created
			expect(ctx.dom.rootStore.has("#test-root")).toBe(true);

			// Clean up the context
			ctx.cleanup();

			// Root context should be removed
			expect(ctx.dom.rootStore.has("#test-root")).toBe(false);

			// Clean up DOM
			document.body.removeChild(mockElement);
		});
	});
});
