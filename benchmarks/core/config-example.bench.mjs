import { signal } from '@hellajs/core';

// Example of using custom config at suite level
global.suite('Core - Config Example', (suite) => {
  // These benchmarks will use the config from benchmarks.config.mjs
  // Global config: warmupRounds: 10, maxTime: 5s
  // Core package override: warmupRounds: 15, maxTime: 10s
  
  const s = signal(0);
  
  suite.add('Signal - Basic Operations', () => {
    s(s() + 1);
  });
  
  suite.add('Signal - Multiple Updates', () => {
    s(1);
    s(2);
    s(3);
  });
}, {
  // Suite-specific custom config overrides
  maxTime: 3, // Override to 3 seconds for this suite
  minSamples: 8 // Ensure at least 8 samples
});