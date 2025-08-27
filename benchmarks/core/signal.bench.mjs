
import { signal, batch } from '@hellajs/core';

global.suite('Core - Signal', (suite) => {
  suite.add('Signal - Create', () => {
    signal(0);
  });

  const s = signal(0);
  suite.add('Signal - Read', () => {
    s();
  });

  suite.add('Signal - Write', () => {
    s(1);
  });

  // New: Batch Operations
  const s1 = signal(0);
  const s2 = signal(0);
  suite.add('Signal - Batch Update', () => {
    batch(() => {
      s1(1);
      s2(2);
    });
  });
});
