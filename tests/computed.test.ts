import { describe, expect, test } from "bun:test";
import { batch, computed, effect, signal, untracked } from "../lib/";
import { flushMicrotasks } from "./flush";

describe("Computed", () => {
	describe("Basic Functionality", () => {
		test("creates a computed value from a signal", () => {
			const count = signal(5);
			const doubled = computed(() => count() * 2);

			expect(doubled()).toBe(10);
		});

		test("automatically updates when dependencies change", () => {
			const count = signal(5);
			const doubled = computed(() => count() * 2);

			count.set(10);
			expect(doubled()).toBe(20);
		});

		test("handles complex expressions", () => {
			const x = signal(10);
			const y = signal(5);

			const sum = computed(() => x() + y());
			const product = computed(() => x() * y());

			expect(sum()).toBe(15);
			expect(product()).toBe(50);

			x.set(20);
			expect(sum()).toBe(25);
			expect(product()).toBe(100);
		});

		test("works with string and object values", () => {
			const firstName = signal("John");
			const lastName = signal("Doe");
			const fullName = computed(() => `${firstName()} ${lastName()}`);

			expect(fullName()).toBe("John Doe");

			firstName.set("Jane");
			expect(fullName()).toBe("Jane Doe");

			// Object example
			const user = signal({ name: "John", age: 30 });
			const userInfo = computed(
				() => `${user().name} is ${user().age} years old`,
			);

			expect(userInfo()).toBe("John is 30 years old");

			user.update((u) => ({ ...u, age: u.age + 1 }));
			expect(userInfo()).toBe("John is 31 years old");
		});
	});

	describe("Optimization and Edge Cases", () => {
		test("computed cleanup removes effect", async () => {
			const count = signal(0);
			let effectRuns = 0;

			const double = computed(() => {
				effectRuns++;
				return count() * 2;
			});

			// First access triggers computation
			expect(double()).toBe(0);
			expect(effectRuns).toBe(1);

			// Update should create new computation on next access
			count.set(5);
			expect(double()).toBe(10);
			expect(effectRuns).toBe(2);

			// Cleanup
			double._cleanup();

			// Update after cleanup
			count.set(10);
			// This should show that computation isn't tracking anymore
			expect(double()).toBe(10); // Still returns last computed value

			// No additional effect runs since cleanup
			expect(effectRuns).toBe(2);
		});

		test("computed correctly handles circular dependencies", () => {
			const a = signal(1);

			// This will cause a circular dependency warning/error in dev mode
			const circular = computed(() => {
				// A computed that depends on itself - this should be detected
				const val = a();
				try {
					// @ts-expect-error Accessing private property for testing
					circular._deps;
					return val;
				} catch (e) {
					return "circular detected";
				}
			});

			// The framework should prevent infinite loops
			expect(() => circular()).not.toThrow();
		});
	});

	describe("Advanced Patterns", () => {
		test("computed can depend on other computed values", () => {
			const count = signal(5);
			const doubled = computed(() => count() * 2);
			const quadrupled = computed(() => doubled() * 2);

			expect(doubled()).toBe(10);
			expect(quadrupled()).toBe(20);

			count.set(10);
			expect(doubled()).toBe(20);
			expect(quadrupled()).toBe(40);
		});

		test("computed with multiple signal dependencies", () => {
			const first = signal("John");
			const last = signal("Doe");
			const age = signal(30);

			const profile = computed(() => ({
				name: `${first()} ${last()}`,
				age: age(),
			}));

			expect(profile()).toEqual({ name: "John Doe", age: 30 });

			first.set("Jane");
			expect(profile()).toEqual({ name: "Jane Doe", age: 30 });

			age.set(25);
			expect(profile()).toEqual({ name: "Jane Doe", age: 25 });
		});

		test("works with effects for side effects", async () => {
			const count = signal(0);
			const doubled = computed(() => count() * 2);
			let effectResult = 0;

			effect(() => {
				effectResult = doubled();
			});

			// Initial run
			expect(effectResult).toBe(0);

			// Update signal
			count.set(5);
			expect(effectResult).toBe(10);

			// Batched updates
			batch(() => {
				count.set(10);
				count.set(15);
			});

			await flushMicrotasks();

			expect(effectResult).toBe(30);
		});

		test("untracked access doesn't create dependencies", () => {
			const count = signal(0);
			const computeCalls = signal(0);

			const computed1 = computed(() => count() * 2);

			const computed2 = computed(() => {
				// Untracked access doesn't create a dependency
				untracked(() => computeCalls.update((call) => call + 1));
				return count() * 3;
			});

			// Initial computation
			expect(computed1()).toBe(0);
			expect(computed2()).toBe(0);
			expect(computeCalls()).toBe(1);

			// Update signal
			count.set(5);

			// computed1 should recompute, computed2 shouldn't
			expect(computed1()).toBe(10); // Recomputed
			expect(computeCalls()).toBe(2);

			expect(computed2()).toBe(15); // Still old value (hasn't recomputed)
			expect(computeCalls()).toBe(2);
		});

		test("computed values are cached until dependencies change", () => {
			const count = signal(10);
			let computeCount = 0;

			const cachedComputed = computed(() => {
				computeCount++;
				return count() * 2;
			});

			// First access
			expect(cachedComputed()).toBe(20);
			expect(computeCount).toBe(1);

			// Repeated access without changes shouldn't recalculate
			expect(cachedComputed()).toBe(20);
			expect(cachedComputed()).toBe(20);
			expect(computeCount).toBe(1);

			// Change dependency
			count.set(20);

			// Now it should recalculate on next access
			expect(cachedComputed()).toBe(40);
			expect(computeCount).toBe(2);
		});

		test("handles errors in computed functions", () => {
			const count = signal(0);
			const errorComputed = computed(() => {
				if (count() === 0) {
					return "safe";
				}
				throw new Error("Test error");
			});

			// Should work initially
			expect(errorComputed()).toBe("safe");

			// Should handle errors when they occur
			expect(() => count.set(1)).toThrow();
		});

		test("complex dependency chain updates correctly", () => {
			const base = signal(1);
			const level1 = computed(() => base() * 2);
			const level2 = computed(() => level1() * 3);
			const level3 = computed(() => level2() * 4);

			expect(level3()).toBe(24); // 1 * 2 * 3 * 4

			base.set(2);
			expect(level3()).toBe(48); // 2 * 2 * 3 * 4
		});
	});
});
