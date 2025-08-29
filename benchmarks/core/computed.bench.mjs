
import { signal, computed, batch } from '@hellajs/core';

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

  // Deep nesting scenarios
  suite.add('Computed - Deep Chain (10 levels)', () => {
    const base = signal(1);
    let current = computed(() => base());
    
    for (let i = 0; i < 9; i++) {
      const prev = current;
      current = computed(() => prev() + 1);
    }
    
    current();
  });

  // Performance-critical scenarios
  suite.add('Computed - Mass Computed (1000 computeds)', () => {
    const base = signal(0);
    const computeds = Array.from({length: 1000}, (_, i) => 
      computed(() => base() + i)
    );
    
    base(42);
    computeds.forEach(c => c());
  });

  // Complex dependency graph
  suite.add('Computed - Complex Dependencies', () => {
    const signals = Array.from({length: 10}, () => signal(0));
    const computeds = signals.map((s, i) => 
      computed(() => signals.slice(0, i + 1).reduce((sum, sig) => sum + sig(), 0))
    );
    
    batch(() => {
      signals.forEach((s, i) => s(i));
    });
    
    computeds.forEach(c => c());
  });

  // New: Reactive Invalidation Scenarios
  suite.add('Computed - Selective Invalidation', () => {
    const s1 = signal(1);
    const s2 = signal(2);
    const s3 = signal(3);
    
    const c1 = computed(() => s1() + s2());
    const c2 = computed(() => s2() + s3());
    const c3 = computed(() => c1() + c2());
    
    batch(() => {
      s1(10); // Should only invalidate c1 and c3
      s3(30); // Should only invalidate c2 and c3
    });
    
    c3();
  });

  suite.add('Computed - Conditional Dependencies', () => {
    const flag = signal(true);
    const a = signal(1);
    const b = signal(2);
    
    const conditional = computed(() => {
      return flag() ? a() : b();
    });
    
    batch(() => {
      flag(false);
      a(100); // Should not cause recomputation
      b(200); // Should cause recomputation
    });
    
    conditional();
  });

  // Memory leak detection
  suite.add('Computed - Memory Leak Test', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    const base = signal(0);
    
    const computeds = Array.from({length: 500}, () => 
      computed(() => base() * Math.random())
    );
    
    // Trigger computations
    for (let i = 0; i < 100; i++) {
      base(i);
      computeds.forEach(c => c());
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryGrowth = (finalMemory - initialMemory) / initialMemory;
    
    if (memoryGrowth > 0.1) {
      console.warn(`Computed memory growth detected: ${(memoryGrowth * 100).toFixed(2)}%`);
    }
  });
});
