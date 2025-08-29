export class BrowserBenchmark {
  constructor(page, name) {
    this.page = page;
    this.name = name;
    this.results = [];
  }

  async run(testFn, options = {}) {
    const {
      iterations = 1000,
      warmupRuns = 5,
      measureMemory = true,
      timeout = 30000
    } = options;

    // Warmup runs
    for (let i = 0; i < warmupRuns; i++) {
      await this.page.evaluate(testFn);
    }

    // Clear metrics before actual measurement
    await this.page.evaluate(() => {
      window.perfMetrics.marks.clear();
      window.perfMetrics.measures = [];
      window.perfMetrics.memory = [];
      performance.clearMarks();
      performance.clearMeasures();
    });

    // Measure initial memory if requested
    let initialMemory = null;
    if (measureMemory) {
      initialMemory = await this.page.evaluate(() => window.measureMemory());
    }

    const startTime = Date.now();
    const durations = [];

    // Run benchmark iterations
    for (let i = 0; i < iterations; i++) {
      const iterationStart = await this.page.evaluate(() => performance.now());
      
      await this.page.evaluate(testFn);
      
      const iterationEnd = await this.page.evaluate(() => performance.now());
      durations.push(iterationEnd - iterationStart);

      // Check timeout
      if (Date.now() - startTime > timeout) {
        console.warn(`Benchmark ${this.name} timed out after ${i + 1} iterations`);
        break;
      }
    }

    // Measure final memory if requested
    let finalMemory = null;
    if (measureMemory) {
      // Force garbage collection if available
      await this.page.evaluate(() => {
        if (window.gc) {
          window.gc();
        }
      });
      finalMemory = await this.page.evaluate(() => window.measureMemory());
    }

    const totalTime = Date.now() - startTime;
    const actualIterations = durations.length;

    const result = {
      name: this.name,
      iterations: actualIterations,
      totalTime,
      avgTime: durations.reduce((a, b) => a + b, 0) / actualIterations,
      minTime: Math.min(...durations),
      maxTime: Math.max(...durations),
      hz: (actualIterations * 1000) / totalTime,
      memory: measureMemory ? {
        initial: initialMemory,
        final: finalMemory,
        growth: finalMemory && initialMemory ? finalMemory.used - initialMemory.used : 0
      } : null,
      durations
    };

    this.results.push(result);
    return result;
  }

  getResults() {
    return this.results;
  }

  getLatestResult() {
    return this.results[this.results.length - 1];
  }
}

export async function measureDOMOperations(page, testFn, options = {}) {
  const benchmark = new BrowserBenchmark(page, options.name || 'DOM Operation');
  return await benchmark.run(testFn, options);
}

export async function measureFrameRate(page, animationFn, duration = 1000) {
  return await page.evaluate((fn, dur) => {
    return new Promise((resolve) => {
      const frames = [];
      let lastFrame = performance.now();
      let animationId;

      function frame() {
        const now = performance.now();
        frames.push(now - lastFrame);
        lastFrame = now;

        if (now < dur) {
          animationId = requestAnimationFrame(frame);
          fn();
        } else {
          resolve({
            frames: frames.length,
            avgFrameTime: frames.reduce((a, b) => a + b, 0) / frames.length,
            fps: frames.length / (dur / 1000),
            frameDeltas: frames
          });
        }
      }

      requestAnimationFrame(frame);
    });
  }, animationFn, duration);
}

export function calculateStats(results) {
  if (!results || results.length === 0) return null;

  const times = results.map(r => r.avgTime);
  const hzValues = results.map(r => r.hz);
  
  return {
    avgTime: times.reduce((a, b) => a + b, 0) / times.length,
    minTime: Math.min(...times),
    maxTime: Math.max(...times),
    avgHz: hzValues.reduce((a, b) => a + b, 0) / hzValues.length,
    maxHz: Math.max(...hzValues),
    minHz: Math.min(...hzValues),
    variance: calculateVariance(times),
    memoryGrowth: results
      .filter(r => r.memory)
      .map(r => r.memory.growth)
      .reduce((a, b) => a + b, 0) / results.length || 0
  };
}

function calculateVariance(values) {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
}