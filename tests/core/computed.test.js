import { describe, expect, test } from 'bun:test';
import { computed, signal } from '../../packages/core/dist/core.js';

describe("computed", () => {
	test('should calculate derived values from user data', () => {
		const firstName = signal("John");
		const lastName = signal("Doe");
		const fullName = computed(() => `${firstName()} ${lastName()}`);

		expect(fullName()).toBe("John Doe");

		firstName("Jane");
		expect(fullName()).toBe("Jane Doe");

		lastName("Smith");
		expect(fullName()).toBe("Jane Smith");
	});

	test('should chain computations for complex calculations', () => {
		const price = signal(100);
		const quantity = signal(2);
		const discount = signal(0.1); // 10% discount

		const subtotal = computed(() => price() * quantity());
		const discountAmount = computed(() => subtotal() * discount());
		const total = computed(() => subtotal() - discountAmount());

		expect(total()).toBe(180); // 200 - 20 = 180

		quantity(3);
		expect(total()).toBe(270); // 300 - 30 = 270
	});

	test('should handle conditional logic based on user state', () => {
		const user = signal({ isLoggedIn: false, isPremium: false });
		const features = computed(() => {
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

	test('should propagate changes through multiple computation layers', () => {
		const temperature = signal(0);
		const isEven = computed(() => temperature() % 2 === 0);
		const displayClass = computed(() => isEven() ? "even-temp" : "odd-temp");
		const statusMessage = computed(() => `Temperature ${temperature()}°C (${displayClass()})`);

		expect(statusMessage()).toBe("Temperature 0°C (even-temp)");

		temperature(1);
		expect(statusMessage()).toBe("Temperature 1°C (odd-temp)");

		temperature(3);
		expect(statusMessage()).toBe("Temperature 3°C (odd-temp)");
	});

	test('should handle complex interdependent computations', () => {
		const userPreference = signal(false);
		const settings = computed(() => userPreference());
		const configValue = computed(() => {
			settings();
			return 0;
		});
		const finalResult = computed(() => {
			configValue();
			return settings();
		});

		expect(finalResult()).toBe(false);
		userPreference(true);
		expect(finalResult()).toBe(true);
	});

	test('should optimize by not recomputing when intermediate results haven\'t changed', () => {
		let computeCount = 0;
		const baseValue = signal(0);

		const expensiveComputation = computed(() => {
			computeCount++;
			return baseValue(); // Just return the base value
		});

		// First access
		expensiveComputation();
		expect(computeCount).toBe(1);

		// Change value then revert - should not recompute
		baseValue(1);
		baseValue(0);
		expensiveComputation();
		expect(computeCount).toBe(1); // Still 1, not recomputed
	});
});
