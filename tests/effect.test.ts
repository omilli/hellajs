import { describe, expect, test } from "bun:test";
import { batch, computed, effect, signal, untracked } from "../lib/";
import { flushMicrotasks } from "./flush";

describe("Effect", () => {
	describe("Basic Functionality", () => {
		test("runs immediately on creation", () => {
			let ran = false;
			effect(() => {
				ran = true;
			});
			expect(ran).toBe(true);
		});

		test("tracks signal dependencies correctly", () => {
			const count = signal(0);
			let effectValue = -1;

			effect(() => {
				effectValue = count();
			});

			expect(effectValue).toBe(0);

			count.set(10);
			expect(effectValue).toBe(10);
		});

		test("reruns when dependencies change", () => {
			const a = signal(1);
			const b = signal(2);
			let runs = 0;
			let sum = 0;

			effect(() => {
				runs++;
				sum = a() + b();
			});

			expect(runs).toBe(1);
			expect(sum).toBe(3);

			a.set(10);
			expect(runs).toBe(2);
			expect(sum).toBe(12);

			b.set(20);
			expect(runs).toBe(3);
			expect(sum).toBe(30);
		});

		test("tracks computed value dependencies", () => {
			const count = signal(0);
			const doubled = computed(() => count() * 2);
			let effectValue = -1;

			effect(() => {
				effectValue = doubled();
			});

			expect(effectValue).toBe(0);

			count.set(5);
			expect(effectValue).toBe(10);
		});
	});

	describe("Cleanup and Disposal", () => {
		test("stops running when disposed", () => {
			const count = signal(0);
			let effectRuns = 0;

			const cleanup = effect(() => {
				count();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			count.set(1);
			expect(effectRuns).toBe(2);

			// Dispose the effect
			cleanup();

			// This shouldn't trigger the effect anymore
			count.set(2);
			expect(effectRuns).toBe(2);
		});

		test("cleans up resources when disposed", () => {
			const count = signal(0);

			const cleanup = effect(() => {
				count();
			});

			// Check that the effect created a dependency on the signal
			expect(count._deps.size).toBeGreaterThan(0);

			// Dispose the effect
			cleanup();

			// Usually we would need to wait for GC to run to verify cleanup
			// But we can at least verify the effect is marked as disposed
			expect(cleanup._disposed).toBe(true);
		});
	});

	describe("Nested Effects", () => {
		test("parent effect disposal cleans up child effects", () => {
			const a = signal(0);
			const b = signal(0);
			let parentRuns = 0;
			let childRuns = 0;

			const disposeParent = effect(() => {
				parentRuns++;
				a();

				// Create a nested effect
				effect(() => {
					childRuns++;
					b();
				});
			});

			expect(parentRuns).toBe(1);
			expect(childRuns).toBe(1);

			// Update parent dependency
			a.set(1);
			expect(parentRuns).toBe(2);
			expect(childRuns).toBe(2); // Child is recreated

			// Update child dependency
			b.set(1);
			expect(parentRuns).toBe(2);
			expect(childRuns).toBe(3); // Only child runs

			// Dispose parent (should also cleanupchild)
			disposeParent();

			// Update both signals
			a.set(2);
			b.set(2);

			// Neither effect should run
			expect(parentRuns).toBe(2);
			expect(childRuns).toBe(3);
		});
	});

	describe("Error Handling", () => {
		test("catches and reports errors in effects", () => {
			const count = signal(0);

			// We expect this to throw but be caught internally
			expect(() => {
				effect(() => {
					const value = count();
					if (value > 0) {
						throw new Error("Test error");
					}
				});

				// This update causes the error
				count.set(1);
			}).toThrow("Test error");
		});
	});

	describe("Batching and Scheduling", () => {
		test("respects batched updates", async () => {
			const a = signal(0);
			const b = signal(0);
			let effectRuns = 0;

			effect(() => {
				a();
				b();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			batch(() => {
				a.set(1);
				b.set(1);
			});

			await flushMicrotasks();

			// Should run only once for both updates
			expect(effectRuns).toBe(2);
		});
	});

	describe("Advanced Patterns", () => {
		test("can read signals without tracking in untracked", () => {
			const count = signal(0);
			let effectRuns = 0;
			let trackedValue = -1;
			let untrackedValue = -1;

			effect(() => {
				effectRuns++;
				trackedValue = count(); // This creates a dependency

				// Read the value without tracking
				untracked(() => {
					untrackedValue = count();
				});
			});

			// Initial values
			expect(effectRuns).toBe(1);
			expect(trackedValue).toBe(0);
			expect(untrackedValue).toBe(0);

			// Update signal
			count.set(5);

			// Effect should run again because of the tracked dependency
			expect(effectRuns).toBe(2);
			expect(trackedValue).toBe(5);
			expect(untrackedValue).toBe(5); // Updated because effect re-ran

			// Set up a separate effect with only untracked access
			let onlyUntrackedRuns = 0;

			effect(() => {
				onlyUntrackedRuns++;
				untracked(() => {
					// This should never create a dependency
					count();
				});
			});

			// Initial run
			expect(onlyUntrackedRuns).toBe(1);

			// Update signal - should not trigger the effect with only untracked access
			count.set(10);

			// First effect runs again because of tracked dependency
			expect(effectRuns).toBe(3);
			expect(trackedValue).toBe(10);

			// Second effect doesn't run again because it has no tracked dependencies
			expect(onlyUntrackedRuns).toBe(1);
		});

		test("works with async effects", async () => {
			const count = signal(0);
			let effectResult = -1;

			effect(async () => {
				const value = count();
				// Simulate async work
				await new Promise((resolve) => setTimeout(resolve, 10));
				effectResult = value * 2;
			});

			// Let the async work complete
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(effectResult).toBe(0);

			// Update the signal
			count.set(5);

			// Let the async work complete again
			await new Promise((resolve) => setTimeout(resolve, 20));
			expect(effectResult).toBe(10);
		});

		test("handles multiple dependency changes", () => {
			const a = signal(1);
			const b = signal(2);
			const c = signal(3);
			let effectRuns = 0;
			let sum = 0;

			effect(() => {
				effectRuns++;
				sum = a() + b() + c();
			});

			expect(effectRuns).toBe(1);
			expect(sum).toBe(6);

			// Update multiple signals
			a.set(10);
			expect(effectRuns).toBe(2);
			expect(sum).toBe(15); // 10 + 2 + 3

			b.set(20);
			expect(effectRuns).toBe(3);
			expect(sum).toBe(33); // 10 + 20 + 3

			c.set(30);
			expect(effectRuns).toBe(4);
			expect(sum).toBe(60); // 10 + 20 + 30
		});

		test("handles deep object structure changes", () => {
			const data = signal({
				user: {
					profile: {
						name: "John",
						address: { city: "New York" },
					},
				},
			});

			let userName = "";
			let city = "";
			let effectRuns = 0;

			effect(() => {
				effectRuns++;
				userName = data().user.profile.name;
				city = data().user.profile.address.city;
			});

			expect(effectRuns).toBe(1);
			expect(userName).toBe("John");
			expect(city).toBe("New York");

			// Update deep property
			data.update((d) => ({
				...d,
				user: {
					...d.user,
					profile: {
						...d.user.profile,
						address: { city: "Boston" },
					},
				},
			}));

			expect(effectRuns).toBe(2);
			expect(userName).toBe("John");
			expect(city).toBe("Boston");
		});
	});
});
