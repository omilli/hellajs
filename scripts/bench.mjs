import { glob } from 'glob';
import { Suite } from 'benchmark';
import path from 'path';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import fs from 'fs/promises';

// Set up a DOM environment for benchmarks that need it
GlobalRegistrator.register();

const suites = [];
const allBenchmarkResults = {};

// Enhanced logging
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`)
};

// Function to add a benchmark suite
global.suite = (name, fn) => {
  const newSuite = new Suite(name);
  fn(newSuite);
  suites.push(newSuite);
};

const packageName = process.argv[2];

try {
  log.info(`Starting benchmark runner for: ${packageName || 'all packages'}`);

  // Find all benchmark files
  const globPattern = packageName ? `benchmarks/${packageName}/*.bench.mjs` : 'benchmarks/**/*.bench.mjs';
  const files = await glob(globPattern);

  if (files.length === 0) {
    log.warn(`No benchmark files found matching pattern: ${globPattern}`);
    process.exit(0);
  }

  log.info(`Found ${files.length} benchmark files: ${files.join(', ')}`);

  // Import all benchmark files to register the suites
  for (const file of files) {
    try {
      log.info(`Loading benchmark file: ${file}`);
      await import(path.resolve(file));
    } catch (error) {
      log.error(`Failed to load benchmark file ${file}: ${error.message}`);
      throw error;
    }
  }

  log.info(`Registered ${suites.length} benchmark suites`);

  // Run all registered suites with proper async handling
  for (let i = 0; i < suites.length; i++) {
    const suite = suites[i];
    log.info(`Running suite ${i + 1}/${suites.length}: ${suite.name}`);

    try {
      await runSuiteAsync(suite);
      log.info(`Completed suite: ${suite.name}`);
    } catch (error) {
      log.error(`Suite ${suite.name} failed: ${error.message}`);
      throw error;
    }
  }

  // Write results only after ALL suites complete
  log.info('All suites completed. Writing results to JSON...');
  await fs.writeFile('benchmarks/all_benchmark_results.json', JSON.stringify(allBenchmarkResults, null, 2));
  log.info('Benchmark results written to benchmarks/all_benchmark_results.json');

} catch (error) {
  log.error(`Benchmark runner failed: ${error.message}`);
  process.exit(1);
}

/**
 * Run a benchmark suite with proper async handling
 */
function runSuiteAsync(suite) {
  return new Promise((resolve, reject) => {
    const suiteResults = [];
    let completedCount = 0;
    const totalBenchmarks = suite.length;

    suite
      .on('start', () => {
        log.info(`Started suite: ${suite.name} (${totalBenchmarks} benchmarks)`);
      })
      .on('cycle', (event) => {
        const benchmark = event.target;
        completedCount++;
        log.info(`  [${completedCount}/${totalBenchmarks}] ${String(benchmark)}`);

        suiteResults.push({
          name: benchmark.name,
          hz: benchmark.hz,
          rme: benchmark.stats.rme,
          sample: benchmark.stats.sample.length
        });
      })
      .on('complete', function () {
        allBenchmarkResults[this.name] = suiteResults;
        log.info(`Suite "${this.name}" finished successfully`);
        resolve();
      })
      .on('error', (event) => {
        log.error(`Benchmark error in suite "${suite.name}": ${event.target.error}`);
        reject(event.target.error);
      })
      .run({
        async: true,  // Enable async mode for proper deferred benchmark handling
        queued: true  // Run benchmarks in queue to avoid timing conflicts
      });
  });
}