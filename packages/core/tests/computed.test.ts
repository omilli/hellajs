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
});
