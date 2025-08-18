import { describe, expect, test } from 'bun:test';
import { computed, effect, batch, signal, untracked } from '../../packages/core';

describe("effect", () => {
	test('should automatically update UI when user data changes', () => {
		let renderCount: number = 0;
		let lastRenderedTitle: string = "";

		interface User {
			name: string;
			role: string;
		}
		const user = signal<User>({ name: "Alice", role: "admin" });
		const pageTitle = computed<string>(() => {
			renderCount++;
			return `Welcome, ${user().name} (${user().role})`;
		});

		const stopAutoUpdate = effect(() => {
			lastRenderedTitle = pageTitle();
		});

		expect(renderCount).toBe(1);
		expect(lastRenderedTitle).toBe("Welcome, Alice (admin)");

		user({ name: "Bob", role: "user" });
		expect(renderCount).toBe(2);
		expect(lastRenderedTitle).toBe("Welcome, Bob (user)");

		// Stop auto-updates
		stopAutoUpdate();
		user({ name: "Charlie", role: "guest" });
		expect(renderCount).toBe(2); // Should not increment
		expect(lastRenderedTitle).toBe("Welcome, Bob (user)"); // Should not change
	});

	test('should handle nested effects properly without infinite loops', () => {
		const counter = signal<number>(0);
		const isEven = computed<boolean>(() => counter() % 2 === 0);

		let nestedEffectRuns: number = 0;

		effect(() => {
			effect(() => {
				isEven();
				nestedEffectRuns++;
				if (nestedEffectRuns >= 2) {
					throw new Error("Nested effect ran too many times - infinite loop detected");
				}
			});
		});

		counter(2); // Should not cause infinite loop
		expect(nestedEffectRuns).toBe(1);
	});

	test('should execute event handlers in predictable order', () => {
		const userId = signal<number>(0);
		const notificationCount = signal<number>(0);
		const userNotificationDiff = computed<number>(() => userId() - notificationCount());
		const eventLog: string[] = [];

		effect(() => {
			userNotificationDiff(); // Subscribe to changes

			effect(() => {
				eventLog.push('user-analytics-updated');
				userId(); // Track user ID changes
			});

			effect(() => {
				eventLog.push('notification-system-updated');
				userId(); // Also care about user changes
				notificationCount(); // And notification changes
			});
		});

		eventLog.length = 0;

		batch(() => {
			notificationCount(1);
			userId(1);
		});

		expect(eventLog).toEqual(['user-analytics-updated', 'notification-system-updated']);
	});

	test('should support custom batched effects for complex operations', () => {
		function createBatchedAnalytics(fn: () => void) {
			return effect(() => batch(fn));
		}

		const analyticsEvents: string[] = [];
		const pageViews = signal<number>(0);
		const userSessions = signal<number>(0);

		const pageViewProcessor = computed<void>(() => {
			analyticsEvents.push('processing-pageviews-start');
			if (!pageViews()) {
				userSessions(1); // Initialize sessions if no page views
			}
			analyticsEvents.push('processing-pageviews-end');
		});

		const sessionTracker = computed<number>(() => {
			analyticsEvents.push('tracking-sessions');
			return userSessions();
		});

		createBatchedAnalytics(() => {
			sessionTracker();
		});
		createBatchedAnalytics(() => {
			pageViewProcessor();
		});

		expect(analyticsEvents).toEqual(['tracking-sessions', 'processing-pageviews-start', 'processing-pageviews-end', 'tracking-sessions']);
	});

	test('should maintain correct execution order even with duplicate subscriptions', () => {
		const primaryData = signal<number>(0);
		const conditionalFlag = signal<number>(0);
		const executionOrder: string[] = [];

		effect(() => {
			executionOrder.push('main-processor');
			const shouldProcessPrimary = untracked(() => conditionalFlag() === 1);
			if (shouldProcessPrimary) {
				primaryData(); // Subscribe to primary data conditionally
			}
			conditionalFlag(); // Always subscribe to flag
			primaryData(); // Also always subscribe to primary data
		});

		effect(() => {
			executionOrder.push('secondary-processor');
			primaryData(); // Subscribe to primary data
		});

		conditionalFlag(1); // This creates the duplicate subscription scenario

		executionOrder.length = 0;
		primaryData(primaryData() + 1);

		expect(executionOrder).toEqual(['main-processor', 'secondary-processor']);
	});

	test('should handle nested effects in component lifecycle', () => {
		const componentMounted = signal<number>(0);
		const userInteractions = signal<number>(0);
		const lifecycleEvents: string[] = [];

		effect(() => {
			// Simulate component mount effect
			effect(() => {
				componentMounted();
				lifecycleEvents.push('component-mounted');
			});

			// Simulate user interaction effect
			effect(() => {
				userInteractions();
				lifecycleEvents.push('user-interaction');
			});

			expect(lifecycleEvents).toEqual(['component-mounted', 'user-interaction']);

			lifecycleEvents.length = 0;
			userInteractions(1);
			componentMounted(1);
			expect(lifecycleEvents).toEqual(['user-interaction', 'component-mounted']);
		});
	});

	test('should handle complex dependency chains during state validation', () => {
		const isFormValid = signal<boolean>(false);
		const validationStatus = computed<boolean>(() => isFormValid());
		const formSubmissionAllowed = computed<number>(() => {
			validationStatus(); // Check validation status
			return 0; // Placeholder computation
		});
		const canSubmitForm = computed<boolean>(() => {
			formSubmissionAllowed(); // Check submission allowance
			return validationStatus(); // Return actual validation status
		});

		let formUpdates: number = 0;

		effect(() => {
			canSubmitForm(); // Subscribe to form submission capability
			formUpdates++;
		});

		expect(formUpdates).toBe(1);
		isFormValid(true);
		expect(formUpdates).toBe(2);
	});
});
