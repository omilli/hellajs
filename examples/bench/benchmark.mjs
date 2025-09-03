import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { existsSync } from 'fs';

// Ensure the app is built first
const distFile = './index.html';
if (!existsSync(distFile)) {
  console.log('Building benchmark app...');
  execSync('npm run build-prod', { stdio: 'inherit' });
}

// Performance measurement utilities
class BenchmarkResult {
  constructor(name, duration, range, memoryDelta = null, memoryRange = null) {
    this.name = name;
    this.duration = duration;
    this.range = range;
    this.memoryDelta = memoryDelta;
    this.memoryRange = memoryRange;
  }

  toString() {
    let result = `${this.name}: ${this.duration.toFixed(2)}ms (±${this.range.toFixed(2)}ms)`;
    if (this.memoryDelta !== null) {
      const memMB = (this.memoryDelta / 1024 / 1024).toFixed(2);
      const rangeMB = (this.memoryRange / 1024 / 1024).toFixed(2);
      result += ` | ${memMB}MB (±${rangeMB}MB)`;
    }
    return result;
  }
}

class HellaJSBenchmark {
  constructor(runs = 5) {
    this.browser = null;
    this.page = null;
    this.results = [];
    this.runs = runs;
  }

  async setup() {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-web-security',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--js-flags=--expose-gc',
        '--enable-precise-memory-info'
      ]
    });

    this.page = await this.browser.newPage();

    // Enable performance tracing
    await this.page.goto(`file://${process.cwd()}/index.html`);

    // Wait for app to be ready
    await this.page.waitForFunction(() => window.document.readyState === 'complete');

    await this.page.waitForSelector('#app', { timeout: 10000 });
    await this.page.waitForSelector('#main', { timeout: 10000 });
  }

  async measureOperation(name, operation, selector = null) {
    console.log(`Running: ${name} (${this.runs} runs)...`);

    const durations = [];
    const memoryDeltas = [];

    for (let i = 0; i < this.runs; i++) {
      // Reset page state before each run
      await this.page.goto(`file://${process.cwd()}/index.html`);
      await this.page.waitForSelector('#main');

      // Count DOM nodes before operation
      const beforeNodes = await this.page.evaluate(() => {
        return {
          totalElements: document.querySelectorAll('*').length,
          tableRows: document.querySelectorAll('tbody tr').length,
          textNodes: document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          ).nextNode() ? Array.from(document.body.querySelectorAll('*')).reduce((count, el) => {
            return count + Array.from(el.childNodes).filter(n => n.nodeType === 3).length;
          }, 0) : 0
        };
      });

      // Start performance tracing
      await this.page.evaluate(() => performance.mark('start'));

      // Perform the operation
      await operation();

      // Wait for DOM to stabilize if selector provided
      if (selector) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
        } catch (e) {
          // Some operations might not have specific selectors to wait for
        }
      }

      // Wait for potential rendering to complete
      await this.page.evaluate(() => {
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      });

      // End performance tracing and count DOM nodes after operation
      const results = await this.page.evaluate(() => {
        performance.mark('end');
        performance.measure('operation', 'start', 'end');
        const entries = performance.getEntriesByName('operation');
        performance.clearMarks();
        performance.clearMeasures();

        return {
          duration: entries[entries.length - 1].duration,
          nodes: {
            totalElements: document.querySelectorAll('*').length,
            tableRows: document.querySelectorAll('tbody tr').length,
            textNodes: document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              null,
              false
            ).nextNode() ? Array.from(document.body.querySelectorAll('*')).reduce((count, el) => {
              return count + Array.from(el.childNodes).filter(n => n.nodeType === 3).length;
            }, 0) : 0
          }
        };
      });

      durations.push(results.duration);

      // Calculate DOM node delta (approximate memory impact)
      if (beforeNodes && results.nodes) {
        const elementDelta = results.nodes.totalElements - beforeNodes.totalElements;
        const textNodeDelta = results.nodes.textNodes - beforeNodes.textNodes;
        // Rough estimate: ~1KB per element, ~100 bytes per text node
        const estimatedMemoryDelta = (elementDelta * 1024) + (textNodeDelta * 100);
        memoryDeltas.push(estimatedMemoryDelta);
      }
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const durationRange = maxDuration - minDuration;

    let avgMemoryDelta = null;
    let memoryRange = null;

    if (memoryDeltas.length > 0) {
      avgMemoryDelta = memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length;
      // Calculate standard deviation for proper uncertainty measure
      const variance = memoryDeltas.reduce((sum, delta) => sum + Math.pow(delta - avgMemoryDelta, 2), 0) / memoryDeltas.length;
      memoryRange = Math.sqrt(variance);
    }

    const result = new BenchmarkResult(name, avgDuration, durationRange, avgMemoryDelta, memoryRange);
    this.results.push(result);
    console.log(`  ✓ ${result.toString()} (avg of ${this.runs} runs)`);

    return result;
  }

  async measureOperationWithSetup(name, setupOperation, testOperation, verifyOperation) {
    console.log(`Running: ${name} (${this.runs} runs)...`);

    const durations = [];
    const memoryDeltas = [];

    for (let i = 0; i < this.runs; i++) {
      // Reset page state and setup
      await this.page.goto(`file://${process.cwd()}/index.html`);
      await this.page.waitForSelector('#main');

      // Perform setup outside of measurement
      await setupOperation();

      // Count DOM nodes after setup (baseline for test operation)
      const beforeNodes = await this.page.evaluate(() => {
        return {
          totalElements: document.querySelectorAll('*').length,
          tableRows: document.querySelectorAll('tbody tr').length,
          textNodes: document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
          ).nextNode() ? Array.from(document.body.querySelectorAll('*')).reduce((count, el) => {
            return count + Array.from(el.childNodes).filter(n => n.nodeType === 3).length;
          }, 0) : 0
        };
      });

      // Start performance tracing
      await this.page.evaluate(() => performance.mark('start'));

      // Perform the test operation
      await testOperation();

      // Wait for potential rendering to complete
      await this.page.evaluate(() => {
        return new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
          });
        });
      });

      // End performance tracing and count DOM nodes after operation
      const results = await this.page.evaluate(() => {
        performance.mark('end');
        performance.measure('operation', 'start', 'end');
        const entries = performance.getEntriesByName('operation');
        performance.clearMarks();
        performance.clearMeasures();

        return {
          duration: entries[entries.length - 1].duration,
          nodes: {
            totalElements: document.querySelectorAll('*').length,
            tableRows: document.querySelectorAll('tbody tr').length,
            textNodes: document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              null,
              false
            ).nextNode() ? Array.from(document.body.querySelectorAll('*')).reduce((count, el) => {
              return count + Array.from(el.childNodes).filter(n => n.nodeType === 3).length;
            }, 0) : 0
          }
        };
      });

      // Verify the operation worked
      if (verifyOperation) {
        await verifyOperation();
      }

      durations.push(results.duration);

      // Calculate DOM node delta (approximate memory impact)
      if (beforeNodes && results.nodes) {
        const elementDelta = results.nodes.totalElements - beforeNodes.totalElements;
        const textNodeDelta = results.nodes.textNodes - beforeNodes.textNodes;
        // Rough estimate: ~1KB per element, ~100 bytes per text node
        const estimatedMemoryDelta = (elementDelta * 1024) + (textNodeDelta * 100);
        memoryDeltas.push(estimatedMemoryDelta);
      }
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const durationRange = maxDuration - minDuration;

    let avgMemoryDelta = null;
    let memoryRange = null;

    if (memoryDeltas.length > 0) {
      avgMemoryDelta = memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length;
      // Calculate standard deviation for proper uncertainty measure
      const variance = memoryDeltas.reduce((sum, delta) => sum + Math.pow(delta - avgMemoryDelta, 2), 0) / memoryDeltas.length;
      memoryRange = Math.sqrt(variance);
    }

    const result = new BenchmarkResult(name, avgDuration, durationRange, avgMemoryDelta, memoryRange);
    this.results.push(result);
    console.log(`  ✓ ${result.toString()} (avg of ${this.runs} runs)`);

    return result;
  }


  // js-framework-benchmark standard operations
  async benchmarkCreate1K() {
    await this.measureOperation(
      'Create 1,000 rows',
      async () => await this.page.click('#create'),
      'tbody tr:nth-child(1000)'
    );
  }

  async benchmarkCreate10K() {
    await this.measureOperation(
      'Create 10,000 rows',
      async () => await this.page.click('#runlots'),
      'tbody tr:nth-child(10000)'
    );
  }

  async benchmarkAppend1K() {
    await this.measureOperationWithSetup(
      'Append 1,000 rows',
      // Setup: Create initial 1k rows
      async () => {
        await this.page.click('#create');
        await this.page.waitForSelector('tbody tr:nth-child(1000)');
      },
      // Test: Append 1k more rows
      async () => {
        await this.page.click('#add');
        await this.page.waitForSelector('tbody tr:nth-child(2000)');
      },
      // Verify: Check we have 2k rows
      async () => {
        const rowCount = await this.page.evaluate(() => document.querySelectorAll('tbody tr').length);
        if (rowCount !== 2000) {
          throw new Error(`Expected 2000 rows, got ${rowCount}`);
        }
      }
    );
  }

  async benchmarkUpdateEvery10th() {
    await this.measureOperationWithSetup(
      'Update every 10th row',
      // Setup: Create initial 1k rows
      async () => {
        await this.page.click('#create');
        await this.page.waitForSelector('tbody tr:nth-child(1000)');
      },
      // Test: Update every 10th row
      async () => {
        await this.page.click('#update');
      },
      // Verify: Check that updates happened (first row text should have changed)
      async () => {
        const firstRowText = await this.page.evaluate(() =>
          document.querySelector('tbody tr:first-child .lbl').textContent
        );
        if (!firstRowText.includes('!!!')) {
          throw new Error('Update operation did not work - no "!!!" found in first row');
        }
      }
    );
  }

  async benchmarkSelectRow() {
    await this.measureOperationWithSetup(
      'Select row',
      // Setup: Create initial 1k rows
      async () => {
        await this.page.click('#create');
        await this.page.waitForSelector('tbody tr:nth-child(1000)');
      },
      // Test: Select second row
      async () => {
        await this.page.click('tbody tr:nth-child(2) .lbl');
      },
      // Verify: Check that row is selected (has danger class)
      async () => {
        const isSelected = await this.page.evaluate(() =>
          document.querySelector('tbody tr:nth-child(2)').classList.contains('danger')
        );
        if (!isSelected) {
          throw new Error('Row selection did not work - no danger class found');
        }
      }
    );
  }

  async benchmarkSwapRows() {
    await this.measureOperationWithSetup(
      'Swap rows',
      // Setup: Create initial 1k rows
      async () => {
        await this.page.click('#create');
        await this.page.waitForSelector('tbody tr:nth-child(1000)');
      },
      // Test: Swap rows
      async () => {
        await this.page.click('#swaprows');
      },
      // Verify: Check that rows were swapped (2nd and 999th should have swapped)
      async () => {
        const secondRowText = await this.page.evaluate(() =>
          document.querySelector('tbody tr:nth-child(2) .col-md-1:first-of-type').textContent
        );
        // After swap, 2nd row should have label ending with 998 (0-indexed 998 = 999th row)
        if (!secondRowText.includes('999')) {
          throw new Error(`Row swap did not work - expected row 998 in position 2, got: ${secondRowText}`);
        }
      }
    );
  }

  async benchmarkRemoveRow() {
    await this.measureOperationWithSetup(
      'Remove single row',
      // Setup: Create initial 1k rows
      async () => {
        await this.page.click('#create');
        await this.page.waitForSelector('tbody tr:nth-child(1000)');
      },
      // Test: Remove second row
      async () => {
        await this.page.click('tbody tr:nth-child(2) .remove');
      },
      // Verify: Check that we now have 999 rows
      async () => {
        const rowCount = await this.page.evaluate(() => document.querySelectorAll('tbody tr').length);
        if (rowCount !== 999) {
          throw new Error(`Expected 999 rows after removal, got ${rowCount}`);
        }
      }
    );
  }

  async benchmarkClear() {
    await this.measureOperationWithSetup(
      'Clear all rows',
      // Setup: Create initial 1k rows
      async () => {
        await this.page.click('#create');
        await this.page.waitForSelector('tbody tr:nth-child(1000)');
      },
      // Test: Clear all rows
      async () => {
        await this.page.click('#clear');
      },
      // Verify: Check that all rows are gone
      async () => {
        const rowCount = await this.page.evaluate(() => document.querySelectorAll('tbody tr').length);
        if (rowCount !== 0) {
          throw new Error(`Expected 0 rows after clear, got ${rowCount}`);
        }
      }
    );
  }

  async benchmarkStartupTime() {
    console.log(`Running: Startup time (${this.runs} runs)...`);

    const durations = [];

    for (let i = 0; i < this.runs; i++) {
      const startTime = Date.now();
      await this.page.goto(`file://${process.cwd()}/index.html`);
      await this.page.waitForSelector('#main');
      await this.page.waitForFunction(() => window.document.readyState === 'complete');
      const endTime = Date.now();

      durations.push(endTime - startTime);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const range = maxDuration - minDuration;

    const result = new BenchmarkResult('Startup time', avgDuration, range);
    this.results.push(result);
    console.log(`  ✓ ${result.toString()} (avg of ${this.runs} runs)`);
  }

  async runAllBenchmarks() {
    console.log(`\n🚀 Starting HellaJS js-framework-benchmark tests (${this.runs} runs each)...\n`);

    await this.benchmarkStartupTime();
    await this.benchmarkCreate1K();
    await this.benchmarkCreate10K();
    await this.benchmarkAppend1K();
    await this.benchmarkUpdateEvery10th();
    await this.benchmarkSelectRow();
    await this.benchmarkSwapRows();
    await this.benchmarkRemoveRow();
    await this.benchmarkClear();
  }

  printResults() {
    console.log('\n📊 Benchmark Results:');
    console.log('='.repeat(50));

    this.results.forEach(result => {
      console.log(result.toString());
    });

    console.log('='.repeat(50));
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Run the benchmark
async function runBenchmark() {
  const benchmark = new HellaJSBenchmark();

  try {
    await benchmark.setup();
    await benchmark.runAllBenchmarks();
    benchmark.printResults();
  } catch (error) {
    console.error('Benchmark failed:', error);
    process.exit(1);
  } finally {
    await benchmark.cleanup();
  }
}

runBenchmark().catch(console.error);