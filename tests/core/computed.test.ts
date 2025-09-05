import { describe, expect, test } from 'bun:test';
import { computed, signal } from '../../packages/core';
import { effect } from '@hellajs/core';

describe("computed", () => {
	describe("basics", () => {
		test('returns a derived value from signals', () => {
			const firstName = signal("John");
			const lastName = signal("Doe");
			const fullName = computed(() => `${firstName()} ${lastName()}`);

			expect(fullName()).toBe("John Doe");

			firstName("Jane");
			expect(fullName()).toBe("Jane Doe");

			lastName("Smith");
			expect(fullName()).toBe("Jane Smith");
		});

		test('chains computations using multiple computed', () => {
			const price = signal(100);
			const quantity = signal(2);
			const discount = signal(0.1);

			const subtotal = computed(() => price() * quantity());
			const discountAmount = computed(() => subtotal() * discount());
			const total = computed(() => subtotal() - discountAmount());

			expect(total()).toBe(180);

			quantity(3);

			expect(total()).toBe(270);
		});

		test('handles conditional logic based on signal state', () => {
			const user = signal({ isLoggedIn: false, isPremium: false });
			const features = computed(() => {
				const { isLoggedIn, isPremium } = user();
				if (!isLoggedIn) return ["browse"];
				if (isPremium) return ["browse", "download", "premium"];
				return ["browse", "download"];
			});

			expect(features()).toEqual(["browse"]);

			user({ isLoggedIn: true, isPremium: false });
			expect(features()).toEqual(["browse", "download"]);

			user({ isLoggedIn: true, isPremium: true });
			expect(features()).toEqual(["browse", "download", "premium"]);
		});
	});

	describe("memoization", () => {
		test('caches simple values when unchanged', () => {
			let computeCount = 0;
			const simpleValue = signal(0);

			const simpleComputation = computed(() =>
				simpleValue() * 2
			);

			effect(() => {
				simpleComputation();
				computeCount++;
			})

			expect(computeCount).toBe(1);

			simpleValue(1);
			expect(computeCount).toBe(2);

			simpleValue(1);
			expect(computeCount).toBe(2);
		});

		test('caches arrays when unchanged', () => {
			let computeCount = 0;
			const complexValue = signal([0, 1, 2, 3, 4]);

			const complexComputation = computed(() =>
				complexValue().map(v => v * 2)
			);

			effect(() => {
				complexComputation();
				computeCount++;
			})

			expect(computeCount).toBe(1);

			complexValue([1, 2, 3]);
			expect(computeCount).toBe(2);

			complexValue([1, 2, 3]);
			expect(computeCount).toBe(2);
		});

		test('caches objects when unchanged', () => {
			let computeCount = 0;
			const complexValue = signal<Record<string, number>>({ a: 1, b: 2, c: 3 });

			const complexComputation = computed(() =>
				Object.values(complexValue()).reduce((sum, val) => sum + val, 0)
			);

			effect(() => {
				complexComputation();
				computeCount++;
			})

			expect(computeCount).toBe(1);

			complexValue({ a: 1, b: 2 });
			expect(computeCount).toBe(2);

			complexValue({ a: 1, b: 2 });
			expect(computeCount).toBe(2);
		});

		test('caches Map when unchanged', () => {
			let computeCount = 0;
			const mapValue = signal(new Map([['a', 1], ['b', 2], ['c', 3]]));

			const mapComputation = computed(() =>
				Array.from(mapValue().values()).reduce((sum, val) => sum + val, 0)
			);

			effect(() => {
				mapComputation();
				computeCount++;
			})

			expect(computeCount).toBe(1);

			mapValue(new Map([['a', 1], ['b', 2]]));
			expect(computeCount).toBe(2);

			mapValue(new Map([['a', 1], ['b', 2]]));
			expect(computeCount).toBe(2);
		});

		test('caches Set when unchanged', () => {
			let computeCount = 0;
			const setValue = signal(new Set([1, 2, 3, 4, 5]));

			const setComputation = computed(() =>
				Array.from(setValue()).reduce((sum, val) => sum + val, 0)
			);

			effect(() => {
				setComputation();
				computeCount++;
			})

			expect(computeCount).toBe(1);

			setValue(new Set([1, 2, 3]));
			expect(computeCount).toBe(2);

			setValue(new Set([1, 2, 3]));
			expect(computeCount).toBe(2);
		});
	});
});
