import { signal, effect, batch, computed } from '@hellajs/core';
import { Suite } from 'benchmark';

const suite = new Suite('Core - Effect');

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

// Deep nesting scenarios
suite.add('Effect - Deep Nesting (5 levels)', () => {
  const s = signal(0);
  const cleanup = effect(() => {
    effect(() => {
      effect(() => {
        effect(() => {
          effect(() => s());
        });
      });
    });
  });
  cleanup();
});

// Memory leak detection for effects
suite.add('Effect - Memory Leak Test', () => {
  const initialMemory = process.memoryUsage().heapUsed;
  const signals = Array.from({length: 100}, () => signal(0));
  const cleanups = [];
  
  // Create many effects
  signals.forEach((s, i) => {
    const cleanup = effect(() => {
      s();
      if (i % 10 === 0) {
        // Simulate some work
        Math.random() * 1000;
      }
    });
    cleanups.push(cleanup);
  });
  
  // Trigger effects
  batch(() => {
    signals.forEach((s, i) => s(i));
  });
  
  // Cleanup all effects
  cleanups.forEach(cleanup => cleanup());
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  const finalMemory = process.memoryUsage().heapUsed;
  const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
  
  if (memoryGrowth > 0.1) {
    console.warn(`Effect memory growth detected: ${(memoryGrowth * 100).toFixed(2)}%`);
  }
});

// Performance-critical scenarios
suite.add('Effect - Mass Effects (1000 effects)', () => {
  const s = signal(0);
  const cleanups = [];
  
  for (let i = 0; i < 1000; i++) {
    const cleanup = effect(() => {
      s();
    });
    cleanups.push(cleanup);
  }
  
  s(42);
  cleanups.forEach(cleanup => cleanup());
});

// New: Cross-Primitive Reactive Scenarios
suite.add('Effect - Effect with Computed Dependencies', () => {
  const s1 = signal(1);
  const s2 = signal(2);
  const c = computed(() => s1() + s2());
  
  const cleanup = effect(() => {
    c(); // Effect depends on computed
  });
  
  batch(() => {
    s1(10);
    s2(20);
  });
  
  cleanup();
});

suite.add('Effect - Cascading Effect Updates', () => {
  const source = signal(0);
  const cleanups = [];
  
  const cleanup1 = effect(() => {
    if (source() > 5) {
      source(source() - 1); // Cascading update
    }
  });
  cleanups.push(cleanup1);
  
  const cleanup2 = effect(() => {
    source(); // Just observe
  });
  cleanups.push(cleanup2);
  
  source(10); // Trigger cascade
  cleanups.forEach(c => c());
});

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .on('complete', function () {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });