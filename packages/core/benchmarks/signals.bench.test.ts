import { bench, run, group } from 'mitata';
import { signal, computed, effect, batch } from '../lib/index';

const ITERATIONS = 100;

group('Signal creation', () => {
  bench('create 10000 signals', () => {
    const signals = [];
    for (let i = 0; i < 10000; i++) {
      signals.push(signal(i));
    }
  });
});

group('Signal Read/Write', () => {
	const s = signal(0);
	bench('read signal', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			s();
		}
	});

	bench('write signal (no subscribers)', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			s(i);
		}
	});

	const s2 = signal(0);
	effect(() => s2());
	bench('write signal (1 subscriber)', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			s2(i);
		}
	});
});

group('Computed Evaluation', () => {
	const s = signal(0);
	const c = computed(() => s() * 2);
	effect(() => c());
	bench('simple computed', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			s(i);
			c();
		}
	});

	const diamond_a = signal(0);
	const diamond_b = computed(() => diamond_a() + 1);
	const diamond_c = computed(() => diamond_a() + 2);
	const diamond_d = computed(() => diamond_b() + diamond_c());
	effect(() => diamond_d());
	bench('diamond computed', () => {
		for (let i = 0; i < ITERATIONS; i++) {
			diamond_a(i);
			diamond_d();
		}
	});
});


group('Batching', () => {
	const s1 = signal(0);
	const s2 = signal(0);
	let count = 0;
	effect(() => {
		s1();
		s2();
		count++;
	});

	bench('un-batched updates', () => {
		count = 0;
		for (let i = 0; i < ITERATIONS; i++) {
			s1(i);
			s2(i);
		}
	});

	bench('batched updates', () => {
		count = 0;
		for (let i = 0; i < ITERATIONS; i++) {
			batch(() => {
				s1(i);
				s2(i);
			});
		}
	});
});

run({
  colors: true,       // Use colors in the output
}).catch((e) => {
  console.error(e);
});

