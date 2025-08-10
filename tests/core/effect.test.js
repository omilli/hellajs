import { describe, expect, test } from 'bun:test';
import { computed, effect, batch, signal, untracked } from '../../packages/core/dist/core.js';

describe("effect", () => {
	test('should automatically update UI when user data changes', () => {
		let renderCount = 0;
		let lastRenderedTitle = "";

		const user = signal({ name: "Alice", role: "admin" });
		const pageTitle = computed(() => {
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
		const counter = signal(0);
		const isEven = computed(() => counter() % 2 === 0);

		let nestedEffectRuns = 0;

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
		const userId = signal(0);
		const notificationCount = signal(0);
		const userNotificationDiff = computed(() => userId() - notificationCount());
		const eventLog = [];

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
		function createBatchedAnalytics(fn) {
			return effect(() => batch(fn));
		}

		const analyticsEvents = [];
		const pageViews = signal(0);
		const userSessions = signal(0);

		const pageViewProcessor = computed(() => {
			analyticsEvents.push('processing-pageviews-start');
			if (!pageViews()) {
				userSessions(1); // Initialize sessions if no page views
			}
			analyticsEvents.push('processing-pageviews-end');
		});

		const sessionTracker = computed(() => {
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
		const primaryData = signal(0);
		const conditionalFlag = signal(0);
		const executionOrder = [];

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
		const componentMounted = signal(0);
		const userInteractions = signal(0);
		const lifecycleEvents = [];

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
		const isFormValid = signal(false);
		const validationStatus = computed(() => isFormValid());
		const formSubmissionAllowed = computed(() => {
			validationStatus(); // Check validation status
			return 0; // Placeholder computation
		});
		const canSubmitForm = computed(() => {
			formSubmissionAllowed(); // Check submission allowance
			return validationStatus(); // Return actual validation status
		});

		let formUpdates = 0;

		effect(() => {
			canSubmitForm(); // Subscribe to form submission capability
			formUpdates++;
		});
		
		expect(formUpdates).toBe(1);
		isFormValid(true);
		expect(formUpdates).toBe(2);
	});
});
