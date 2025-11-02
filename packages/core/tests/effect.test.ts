import { describe, expect, test } from 'bun:test';
import { effect, signal, computed, batch } from '../dist/core';

describe("effect", () => {
	test('runs immediately and on dependency changes', () => {
		const count = signal(0);
		let runs = 0;

		effect(() => {
			count();
			runs++;
		});

		expect(runs).toBe(1);
		count(1);
		expect(runs).toBe(2);
	});

	test('cleanup stops effect execution', () => {
		const count = signal(0);
		let runs = 0;

		const cleanup = effect(() => {
			count();
			runs++;
		});

		expect(runs).toBe(1);
		cleanup();
		count(1);
		expect(runs).toBe(1);
	});

	test('supports nested effects', () => {
		const trigger = signal(0);
		let outerRuns = 0;
		let innerRuns = 0;

		effect(() => {
			trigger();
			outerRuns++;
			effect(() => {
				innerRuns++;
			});
		});

		expect(outerRuns).toBe(1);
		expect(innerRuns).toBe(1);

		trigger(1);
		expect(outerRuns).toBe(2);
		expect(innerRuns).toBe(2);
	});

	test('tracks multiple dependencies', () => {
		const signal_A = signal(1);
		const signal_B = signal(2);
		let runs = 0;

		effect(() => {
			signal_A();
			signal_B();
			runs++;
		});

		expect(runs).toBe(1);
		signal_A(2);
		expect(runs).toBe(2);
		signal_B(3);
		expect(runs).toBe(3);
	});

	test('batched effects execute in order', () => {
		const signal_A = signal(0);
		const signal_B = signal(0);
		const derived = computed(() => signal_A() - signal_B());
		const executionOrder: string[] = [];

		effect(() => {
			derived();
			effect(() => {
				executionOrder.push('effect1');
				signal_A();
			});
			effect(() => {
				executionOrder.push('effect2');
				signal_A();
				signal_B();
			});
		});

		executionOrder.length = 0;

		batch(() => {
			signal_B(1);
			signal_A(1);
		});

		expect(executionOrder).toEqual(['effect1', 'effect2']);
	});
});