import { describe, expect, test } from 'bun:test';
import { computed, signal } from '../../packages/core';

describe("computed", () => {
	test('calculate derived values from user data', () => {
		const firstName = signal<string>("John");
		const lastName = signal<string>("Doe");
		const fullName = computed<string>(() => `${firstName()} ${lastName()}`);

		expect(fullName()).toBe("John Doe");

		firstName("Jane");
		expect(fullName()).toBe("Jane Doe");

		lastName("Smith");
		expect(fullName()).toBe("Jane Smith");
	});

	test('chain computations for complex calculations', () => {
		const price = signal<number>(100);
		const quantity = signal<number>(2);
		const discount = signal<number>(0.1); // 10% discount

		const subtotal = computed<number>(() => price() * quantity());
		const discountAmount = computed<number>(() => subtotal() * discount());
		const total = computed<number>(() => subtotal() - discountAmount());

		expect(total()).toBe(180); // 200 - 20 = 180

		quantity(3);
		expect(total()).toBe(270); // 300 - 30 = 270
	});

	test('handle conditional logic based on user state', () => {
		interface User {
			isLoggedIn: boolean;
			isPremium: boolean;
		}
		const user = signal<User>({ isLoggedIn: false, isPremium: false });
		const features = computed<string[]>(() => {
			const { isLoggedIn, isPremium } = user();
			if (!isLoggedIn) return ["browse"];
			if (isPremium) return ["browse", "download", "premium-content"];
			return ["browse", "download"];
		});

		expect(features()).toEqual(["browse"]);

		user({ isLoggedIn: true, isPremium: false });
		expect(features()).toEqual(["browse", "download"]);

		user({ isLoggedIn: true, isPremium: true });
		expect(features()).toEqual(["browse", "download", "premium-content"]);
	});

	test('propagate changes through multiple computation layers', () => {
		const temperature = signal<number>(0);
		const isEven = computed<boolean>(() => temperature() % 2 === 0);
		const displayClass = computed<string>(() => isEven() ? "even-temp" : "odd-temp");
		const statusMessage = computed<string>(() => `Temperature ${temperature()}°C (${displayClass()})`);

		expect(statusMessage()).toBe("Temperature 0°C (even-temp)");

		temperature(1);
		expect(statusMessage()).toBe("Temperature 1°C (odd-temp)");

		temperature(3);
		expect(statusMessage()).toBe("Temperature 3°C (odd-temp)");
	});

	test('handle complex interdependent computations', () => {
		const userPreference = signal<boolean>(false);
		const settings = computed<boolean>(() => userPreference());
		const configValue = computed<number>(() => {
			settings();
			return 0;
		});
		const finalResult = computed<boolean>(() => {
			configValue();
			return settings();
		});

		expect(finalResult()).toBe(false);
		userPreference(true);
		expect(finalResult()).toBe(true);
	});

	test('optimizes by not recomputing when intermediate results haven\'t changed', () => {
		let computeCount: number = 0;
		const baseValue = signal<number>(0);

		const expensiveComputation = computed<number>(() => {
			computeCount++;
			return baseValue(); // Just return the base value
		});

		// First access
		expensiveComputation();
		expect(computeCount).toBe(1);

		// Change value then revert - not recompute
		baseValue(1);
		baseValue(0);
		expensiveComputation();
		expect(computeCount).toBe(1); // Still 1, not recomputed
	});
});
