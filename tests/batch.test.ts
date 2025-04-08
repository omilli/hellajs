import { describe, expect, test } from "bun:test";
import { batch, computed, effect, signal } from "../lib";
import { flushMicrotasks } from "./flush";

describe("Batch", () => {
	describe("Basic Functionality", () => {
		test("batches multiple signal updates", async () => {
			const count = signal(0);
			let effectRuns = 0;

			effect(() => {
				count();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// Update signal three times but should only trigger effect once
			batch(() => {
				count.set(1);
				count.set(2);
				count.set(3);
			});

			await flushMicrotasks();
			expect(effectRuns).toBe(2);
			expect(count()).toBe(3);
		});

		test("returns the result of the batch function", () => {
			const result = batch(() => {
				return "test result";
			});

			expect(result).toBe("test result");
		});

		test("nested batches work correctly", async () => {
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

				batch(() => {
					b.set(1);
					a.set(2);
				});

				b.set(2);
			});

			await flushMicrotasks();
			expect(effectRuns).toBe(2);
			expect(a()).toBe(2);
			expect(b()).toBe(2);
		});
	});

	describe("Error Handling", () => {
		test("cleans up properly if an error occurs during batch", async () => {
			const count = signal(0);
			let effectRuns = 0;

			effect(() => {
				count();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			// This should throw but the batch state should be cleaned up
			expect(() => {
				batch(() => {
					count.set(1);
					throw new Error("Test error");
					// The following line won't execute
					// biome-ignore lint/correctness/noUnreachable:
					count.set(2);
				});
			}).toThrow("Test error");

			await flushMicrotasks();
			// Effect should still run with the value that was set before the error
			expect(effectRuns).toBe(2);
			expect(count()).toBe(1);

			// Batching should work normally after an error
			batch(() => {
				count.set(3);
			});

			await flushMicrotasks();
			expect(effectRuns).toBe(3);
			expect(count()).toBe(3);
		});
	});

	describe("Advanced Patterns", () => {
		test("batches updates from computed values", async () => {
			const a = signal(1);
			const b = signal(2);
			let computedRuns = 0;
			let effectRuns = 0;

			const sum = computed(() => {
				computedRuns++;
				return a() + b();
			});

			effect(() => {
				sum();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);
			expect(computedRuns).toBe(1);

			batch(() => {
				a.set(10);
				b.set(20);
			});

			await flushMicrotasks();
			expect(effectRuns).toBe(2);
			// The computed runs once initially and once for each signal update in the batch
			expect(computedRuns).toBe(3);
			expect(sum()).toBe(30);
		});

		test("works with multiple dependent effects", async () => {
			const count = signal(0);
			let effect1Runs = 0;
			let effect2Runs = 0;
			let effect3Runs = 0;

			effect(() => {
				count();
				effect1Runs++;
			});

			effect(() => {
				count();
				effect2Runs++;
			});

			effect(() => {
				count();
				effect3Runs++;
			});

			expect(effect1Runs).toBe(1);
			expect(effect2Runs).toBe(1);
			expect(effect3Runs).toBe(1);

			batch(() => {
				count.set(1);
				count.set(2);
				count.set(3);
			});

			await flushMicrotasks();
			expect(effect1Runs).toBe(2);
			expect(effect2Runs).toBe(2);
			expect(effect3Runs).toBe(2);
		});

		test("handles complex dependency chains", async () => {
			const a = signal(0);
			const b = signal(0);

			// b depends on a
			const derived1 = computed(() => a() * 2);

			// c depends on a and b
			const derived2 = computed(() => derived1() + b());

			let effectRuns = 0;

			effect(() => {
				derived2();
				effectRuns++;
			});

			expect(effectRuns).toBe(1);

			batch(() => {
				a.set(5); // This affects both derived1 and derived2
				b.set(10); // This affects only derived2
			});

			await flushMicrotasks();
			expect(effectRuns).toBe(2);
			expect(derived1()).toBe(10);
			expect(derived2()).toBe(20);
		});
	});
});
