
import { signal, computed } from '@hellajs/core';

global.suite('Core - Computed', (suite) => {
  const s1 = signal(0);
  const c = computed(() => s1());
  suite.add('Computed - Simple', () => {
    c();
  });

  const s2 = signal(1);
  const c1 = computed(() => s2() * 2);
  const c2 = computed(() => c1() + 1);
  suite.add('Computed - Chained', () => {
    c2();
  });
});
