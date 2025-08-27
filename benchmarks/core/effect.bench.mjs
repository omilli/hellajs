
import { signal, effect } from '@hellajs/core';

global.suite('Core - Effect', (suite) => {
  const s1 = signal(0);
  suite.add('Effect - Basic', () => {
    const cleanup = effect(() => s1());
    cleanup();
  });

  const s2 = signal(0);
  suite.add('Effect - Nested', () => {
    const cleanup = effect(() => {
      effect(() => s2());
    });
    cleanup();
  });
});
