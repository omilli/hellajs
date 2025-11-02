import { describe, expect, test } from 'bun:test';
import { computed, effect, signal, untracked } from '../dist/core';

describe("untracked", () => {
	test('in computed', () => {
		const count = signal(0);

		let computations = 0;
		const result = computed(() => {
			computations++;
			return untracked(() => count());
		});

		expect(result()).toBe(0);
		expect(computations).toBe(1);

		count(1);
		expect(computations).toBe(1);
	});

	test('in effect', () => {
		const data = signal(0);
		let executions = 0;

		effect(() => {
			executions++;
			untracked(() => data());
		});

		expect(executions).toBe(1);

		data(1);
		expect(executions).toBe(1);
	});
});