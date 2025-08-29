
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

  // Batch Operations - Enhanced
  const s1 = signal(0);
  const s2 = signal(0);
  suite.add('Signal - Batch Update (2 signals)', () => {
    batch(() => {
      s1(1);
      s2(2);
    });
  });

  // Performance-critical scenarios
  suite.add('Signal - Large Batch Update (100 signals)', () => {
    const signals = Array.from({length: 100}, () => signal(0));
    batch(() => {
      signals.forEach((sig, i) => sig(i));
    });
  });

  suite.add('Signal - Mass Creation (1000 signals)', () => {
    const signals = Array.from({length: 1000}, () => signal(0));
    signals.forEach(s => s());
  });

  suite.add('Signal - Deep Updates (1000 operations)', () => {
    const testSignal = signal(0);
    for (let i = 0; i < 1000; i++) {
      testSignal(i);
    }
  });

  // New: Advanced Signal Scenarios
  suite.add('Signal - Signal Comparison Performance', () => {
    const s1 = signal({ id: 1, value: 'test' });
    const s2 = signal({ id: 1, value: 'test' });
    
    for (let i = 0; i < 1000; i++) {
      s1({ id: i, value: `test-${i}` });
      s2({ id: i, value: `test-${i}` });
    }
  });

  suite.add('Signal - Signal Array Updates', () => {
    const arraySignal = signal([1, 2, 3]);
    
    for (let i = 0; i < 100; i++) {
      const current = arraySignal();
      arraySignal([...current, i + 4]);
    }
  });

  suite.add('Signal - Signal Object Updates', () => {
    const objSignal = signal({ count: 0, items: [] });
    
    for (let i = 0; i < 100; i++) {
      const current = objSignal();
      objSignal({
        ...current,
        count: current.count + 1,
        items: [...current.items, `item-${i}`]
      });
    }
  });

  // Memory leak detection
  suite.add('Signal - Memory Leak Test', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const signals = Array.from({length: 1000}, () => signal(0));
    signals.forEach(s => s(Math.random()));
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
    
    if (memoryGrowth > 0.1) {
      console.warn(`Memory growth detected: ${(memoryGrowth * 100).toFixed(2)}%`);
    }
  });
});
