import { bench, run, group } from "mitata";
import { signal, computed, effect, batch } from "../lib/index";

const ITERATIONS = 100;

group("Signal creation", () => {
  bench("create 10000 signals", () => {
    const signals = [];
    for (let i = 0; i < 10000; i++) {
      signals.push(signal(i));
    }
  });
});

group("Signal Read/Write", () => {
  const s = signal(0);
  bench("read signal", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      s();
    }
  });

  bench("write signal (no subscribers)", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      s(i);
    }
  });

  const s2 = signal(0);
  effect(() => s2());
  bench("write signal (1 subscriber)", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      s2(i);
    }
  });
});

group("Computed Evaluation", () => {
  const s = signal(0);
  const c = computed(() => s() * 2);
  effect(() => c());
  bench("simple computed", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      s(i);
      c();
    }
  });

  const diamondA = signal(0);
  const diamondB = computed(() => diamondA() + 1);
  const diamondC = computed(() => diamondA() + 2);
  const diamondD = computed(() => diamondB() + diamondC());
  effect(() => diamondD());
  bench("diamond computed", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      diamondA(i);
      diamondD();
    }
  });
});


group("Batching", () => {
  const s1 = signal(0);
  const s2 = signal(0);
  effect(() => {
    s1();
    s2();
  });

  bench("un-batched updates", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      s1(i);
      s2(i);
    }
  });

  bench("batched updates", () => {
    for (let i = 0; i < ITERATIONS; i++) {
      batch(() => {
        s1(i);
        s2(i);
      });
    }
  });

});

run({
  colors: true, // Use colors in the output
}).catch((e) => {
  console.error(e);
});
