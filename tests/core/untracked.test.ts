import { describe, expect, test } from 'bun:test';
import { computed, effect, signal, untracked } from '../../packages/core';

describe("untracked", () => {
	test('allow reading values without creating reactive dependencies', () => {
		const currentUserId = signal(0);

		let profileComputations = 0;
		const userProfile = computed(() => {
			profileComputations++;
			// Read user ID without creating a dependency - maybe for logging or debugging
			return untracked(() => currentUserId());
		});

		expect(userProfile()).toBe(0);
		expect(profileComputations).toBe(1);

		// Changing user ID shouldn't trigger recomputation since it's untracked
		currentUserId(1);
		currentUserId(2);
		currentUserId(3);
		expect(userProfile()).toBe(0); // Still returns old value
		expect(profileComputations).toBe(1); // Should not recompute
	});

	test('conditionally track dependencies based on app state', () => {
		const analyticsData = signal(0);
		const trackingEnabled = signal(0);

		let effectExecutions = 0;
		effect(() => {
			effectExecutions++;
			if (trackingEnabled()) {
				// Only track analytics data when tracking is enabled
				untracked(() => analyticsData());
			}
		});

		expect(effectExecutions).toBe(1);

		// Enable tracking
		trackingEnabled(1);
		expect(effectExecutions).toBe(2);

		// Analytics data changes shouldn't trigger effects (it's untracked)
		analyticsData(1);
		analyticsData(2);
		analyticsData(3);
		expect(effectExecutions).toBe(2);

		// Changing tracking state should trigger effect
		trackingEnabled(2);
		expect(effectExecutions).toBe(3);

		// Still untracked
		analyticsData(4);
		analyticsData(5);
		analyticsData(6);
		expect(effectExecutions).toBe(3);

		// Disable tracking
		trackingEnabled(0);
		expect(effectExecutions).toBe(4);

		// Analytics changes still don't trigger effects
		analyticsData(7);
		analyticsData(8);
		analyticsData(9);
		expect(effectExecutions).toBe(4);
	});

	test('enables performance optimizations by avoiding unnecessary subscriptions', () => {
		const expensiveComputationInput = signal(100);
		const shouldComputeExpensively = signal(false);

		let expensiveOperations = 0;
		const optimizedResult = computed(() => {
			if (shouldComputeExpensively()) {
				// Perform expensive computation that depends on input
				expensiveOperations++;
				return expensiveComputationInput() * 2;
			} else {
				// Read input for debugging/logging without creating dependency
				untracked(() => expensiveComputationInput());
				return 0; // Return cached/default value
			}
		});

		expect(optimizedResult()).toBe(0);
		expect(expensiveOperations).toBe(0);

		// Input changes shouldn't trigger recomputation when optimization is enabled
		expensiveComputationInput(200);
		expensiveComputationInput(300);
		expect(optimizedResult()).toBe(0);
		expect(expensiveOperations).toBe(0);

		// Enable expensive computation
		shouldComputeExpensively(true);
		expect(optimizedResult()).toBe(600); // 300 * 2
		expect(expensiveOperations).toBe(1);

		// Now input changes should trigger recomputation
		expensiveComputationInput(400);
		expect(optimizedResult()).toBe(800); // 400 * 2
		expect(expensiveOperations).toBe(2);
	});
});