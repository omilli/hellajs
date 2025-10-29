import { describe, expect, test } from 'bun:test';

function testMemo<T>(
	initialValue: T,
	newValue: T,
	computedFn: (value: T) => any
) {
	let computeCount = 0;
	const testSignal = signal(initialValue);

	const testComputed = computed(() => computedFn(testSignal()));

	effect(() => {
		testComputed();
		computeCount++;
	});

	// Initial computation should happen
	expect(computeCount).toBe(1);

	// Changing to new value should trigger recomputation
	testSignal(newValue);
	expect(computeCount).toBe(2);

	// Setting same value should not trigger recomputation
	testSignal(newValue);
	expect(computeCount).toBe(2);
}

describe("computed", () => {
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

	test('caches simple values when unchanged', () => {
		testMemo(0, 1, (value) => value * 2);
	});

	test('caches arrays when unchanged', () => {
		testMemo(
			[0, 1, 2, 3, 4],
			[1, 2, 3],
			(value) => value.map(v => v * 2)
		);
	});

	test('caches objects when unchanged', () => {
		testMemo(
			{ a: 1, b: 2, c: 3 } as Record<string, number>,
			{ a: 1, b: 2 },
			(value) => Object.values(value).reduce((sum, val) => sum + val, 0)
		);
	});

	test('caches Map when unchanged', () => {
		testMemo(
			new Map(Object.entries({ a: 1, b: 2, c: 3 })),
			new Map(Object.entries({ a: 1, b: 2 })),
			(map) => (map.get("a") || 0) + (map.get("b") || 0) + (map.get("c") || 0)
		);
	});

	test('caches Set when unchanged', () => {
		testMemo(
			new Set([1, 2, 3, 4, 5]),
			new Set([1, 2, 3]),
			(set) => Array.from(set).reduce((sum, val) => sum + val, 0)
		);
	});

	test('receives previousValue as parameter on first call (undefined)', () => {
		const count = signal(5);
		let receivedPrev: number | undefined;

		const doubled = computed<number>((prev) => {
			receivedPrev = prev;
			return count() * 2;
		});

		doubled(); // First call
		expect(receivedPrev).toBeUndefined();
	});

	test('receives previousValue as parameter on subsequent calls', () => {
		const count = signal(5);
		const previousValues: (number | undefined)[] = [];

		const doubled = computed<number>((prev) => {
			previousValues.push(prev);
			return count() * 2;
		});

		doubled(); // First call: prev should be undefined
		count(10); // Change signal
		doubled(); // Second call: prev should be 10 (previous computed value)
		count(15); // Change signal again
		doubled(); // Third call: prev should be 20 (previous computed value)

		expect(previousValues).toEqual([undefined, 10, 20]);
	});

	test('allows optimization using previousValue', () => {
		const items = signal([1, 2, 3]);
		let expensiveCallCount = 0;

		function expensiveCalculation(arr: number[]): number {
			expensiveCallCount++;
			return arr.reduce((sum, val) => sum + val, 0);
		}

		const total = computed((prev) => {
			const currentItems = items();
			// Optimization: skip calculation if array is empty
			if (currentItems.length === 0 && prev !== undefined) {
				return prev;
			}
			return expensiveCalculation(currentItems);
		});

		expect(total()).toBe(6);
		expect(expensiveCallCount).toBe(1);

		// Set to empty array
		items([]);
		expect(total()).toBe(6); // Should return previous value
		expect(expensiveCallCount).toBe(1); // Should not call expensive function

		// Set to new array
		items([4, 5]);
		expect(total()).toBe(9);
		expect(expensiveCallCount).toBe(2);
	});

	test('previousValue matches actual previous computed result', () => {
		const a = signal(2);
		const b = signal(3);

		const product = computed((prev) => {
			const result = a() * b();
			if (prev !== undefined) {
				// Verify prev matches the last returned value
				expect(prev).toBe(6); // First change: prev should be 6
			}
			return result;
		});

		expect(product()).toBe(6); // 2 * 3

		a(4);
		expect(product()).toBe(12); // 4 * 3
	});

	test('skips recomputation when dependency versions unchanged', () => {
		const a = signal(1);
		const b = signal(2);
		let computeCount = 0;

		const sum = computed(() => {
			computeCount++;
			return a() + b();
		});

		const doubled = computed(() => {
			return sum() * 2;
		});

		expect(doubled()).toBe(6);
		expect(computeCount).toBe(1);

		a(3);
		expect(doubled()).toBe(10);
		expect(computeCount).toBe(2);

		a(3);
		expect(doubled()).toBe(10);
		expect(computeCount).toBe(2);
	});

	test('skips recomputation when parent computed value unchanged', () => {
		const input = signal(5);
		let parentComputes = 0;
		let childComputes = 0;

		const parent = computed(() => {
			parentComputes++;
			const val = input();
			return val > 10 ? 'high' : 'low';
		});

		const child = computed(() => {
			childComputes++;
			return parent() + '-value';
		});

		expect(child()).toBe('low-value');
		expect(parentComputes).toBe(1);
		expect(childComputes).toBe(1);

		input(7);
		expect(child()).toBe('low-value');
		expect(parentComputes).toBe(2);
		expect(childComputes).toBe(1);

		input(15);
		expect(child()).toBe('high-value');
		expect(parentComputes).toBe(3);
		expect(childComputes).toBe(2);
	});
});
