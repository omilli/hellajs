import { describe, expect, mock, test } from "bun:test";
import { batch, computed, effect, signal, untracked } from "../lib";

describe("Untracked", () => {
	describe("Basic Functionality", () => {
		test("reads a signal without creating a dependency", () => {
			const count = signal(0);
			let effectRuns = 0;

			effect(() => {
				// Read the signal inside untracked
				untracked(() => {
					count();
				});

				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Update the signal - should not trigger the effect
			count.set(5);
			expect(effectRuns).toBe(1);
		});

		test("returns the result of the callback function", () => {
			const count = signal(10);

			const result = untracked(() => {
				return count() * 2;
			});

			expect(result).toBe(20);
		});

		test("prevents dependency tracking for nested signals", () => {
			const a = signal(1);
			const b = signal(2);
			let effectRuns = 0;

			effect(() => {
				untracked(() => {
					a();
					b();
				});

				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Update both signals - should not trigger the effect
			a.set(10);
			b.set(20);

			expect(effectRuns).toBe(1);
		});
	});

	describe("Advanced Patterns", () => {
		test("works with mixed tracked and untracked dependencies", () => {
			const a = signal(1);
			const b = signal(2);
			let effectRuns = 0;

			effect(() => {
				// Track dependency on a
				a();

				// Don't track dependency on b
				untracked(() => {
					b();
				});

				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Updating a should trigger the effect
			a.set(10);
			expect(effectRuns).toBe(2);

			// Updating b should not trigger the effect
			b.set(20);
			expect(effectRuns).toBe(2);
		});

		test("can be used to conditionally read signals", () => {
			const shouldRead = signal(false);
			const count = signal(0);
			let displayedValue = 0;

			effect(() => {
				// Only track dependency on shouldRead
				if (shouldRead()) {
					displayedValue = count();
				} else {
					// Read the value without tracking
					displayedValue = untracked(() => count());
				}
			});

			// Initial state: no tracking
			expect(displayedValue).toBe(0);

			// Update count - should not affect displayedValue because we're not tracking
			count.set(5);
			expect(displayedValue).toBe(0);

			// Enable tracking
			shouldRead.set(true);
			expect(displayedValue).toBe(5);

			// Now updates to count should update displayedValue
			count.set(10);
			expect(displayedValue).toBe(10);

			// Disable tracking
			shouldRead.set(false);
			expect(displayedValue).toBe(10);

			// Update count - should not update displayedValue now
			count.set(15);
			expect(displayedValue).toBe(10);
		});

		test("works with computed values", () => {
			const a = signal(1);
			const b = signal(2);

			const sum = computed(() => a() + b());
			let effectRuns = 0;

			effect(() => {
				untracked(() => {
					sum();
				});

				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Update signals - should not trigger the effect
			a.set(10);
			b.set(20);

			expect(effectRuns).toBe(1);
			expect(sum()).toBe(30);
		});

		test("properly restores tracking after untracked section", () => {
			const a = signal(1);
			const b = signal(2);
			const c = signal(3);
			let effectRuns = 0;

			effect(() => {
				// Track a
				a();

				// Don't track b
				untracked(() => {
					b();
				});

				// Track c
				c();

				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Update a - should trigger
			a.set(10);
			expect(effectRuns).toBe(2);

			// Update b - should not trigger
			b.set(20);
			expect(effectRuns).toBe(2);

			// Update c - should trigger
			c.set(30);
			expect(effectRuns).toBe(3);
		});
	});

	describe("Error Handling", () => {
		test("restores tracking even if an error occurs", () => {
			const a = signal(1);
			const b = signal(2);
			let effectRuns = 0;

			effect(() => {
				// Track a
				a();

				try {
					untracked(() => {
						throw new Error("Test error");
					});
				} catch (e) {
					// Ignore error
				}

				// We should still be tracking here
				b();

				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Both a and b should trigger the effect
			a.set(10);
			expect(effectRuns).toBe(2);

			b.set(20);
			expect(effectRuns).toBe(3);
		});
	});
});
