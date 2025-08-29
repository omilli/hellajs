import { Suite } from 'benchmark';
import path from 'path';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
import fs from 'fs/promises';
import os from 'os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { logger } from './utils/common.js';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

function execCommand(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit", // Stream output directly to terminal
      cwd: projectRoot,
      ...options,
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve({ code });
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

// Set up Happy DOM for terminal benchmarks
GlobalRegistrator.register();
console.log('Running terminal benchmarks with Happy DOM');

const suites = [];
const allBenchmarkResults = {};

// Enhanced logging
const log = {
  info: (msg) => console.log(`[INFO] ${new Date().toISOString()} ${msg}`),
  warn: (msg) => console.warn(`[WARN] ${new Date().toISOString()} ${msg}`),
  error: (msg) => console.error(`[ERROR] ${new Date().toISOString()} ${msg}`)
};

let benchmarkConfig = {
  // Global benchmark settings
  global: {
    warmupRounds: 5,
    minSamples: 3,
    maxTime: 3, // seconds
    async: true,
    queued: true
  },

  // Output configuration
  output: {
    format: 'json', // 'json', 'console', 'csv'
    file: 'benchmarks/results.json',
    includeSystemInfo: true,
    precision: 2
  },

  // Package-specific overrides
  packages: {
    core: {
      warmupRounds: 15, // More warmup for core primitives
      maxTime: 10
    },
    router: {
      minSamples: 10 // More samples for router stability
    },
    css: {
      maxTime: 8
    },
    dom: {
      maxTime: 8
    },
    resource: {
      maxTime: 8
    },
    store: {
      maxTime: 8
    }
  },

  // Suite-specific overrides
  suites: {
    'Core - Signal': {
      warmupRounds: 20,
      maxTime: 15
    },
    'DOM - Mount': {
      warmupRounds: 5, // DOM operations need less warmup
      maxTime: 8
    }
  },

  // Environment detection
  env: {
    ci: {
      maxTime: 3, // Faster CI runs
      minSamples: 3,
      warmupRounds: 5
    },
    dev: {
      maxTime: 10, // Thorough dev testing
      minSamples: 5,
      warmupRounds: 10
    }
  }
};

// Get effective config for a specific context
/**
 * Load benchmark configuration from file or use defaults
 */
async function loadBenchmarkConfig() {
  const configPath = path.join('benchmarks', 'config.mjs');
  try {
    const configModule = await import(path.resolve(configPath));
    return configModule.default || benchmarkConfig;
  } catch {
    // Return default config if loading fails
    return benchmarkConfig;
  }
}

function getEffectiveConfig(suiteName, packageName) {
  if (!benchmarkConfig) return { async: true, queued: true };

  const isCI = process.env.CI === 'true' || process.env.NODE_ENV === 'test';
  const envKey = isCI ? 'ci' : 'dev';

  // Merge configs in order of precedence: global < env < package < suite
  const config = {
    ...benchmarkConfig.global,
    ...(benchmarkConfig.env[envKey] || {}),
    ...(packageName && benchmarkConfig.packages[packageName] || {}),
    ...(suiteName && benchmarkConfig.suites[suiteName] || {})
  };

  return config;
}

async function preparePackages(packageName) {
  logger.info(`Preparing packages for benchmarking: ${packageName ? packageName : "all packages"}`);

  // Step 1: Clean
  logger.info("Step 1/2: Cleaning build artifacts...");
  const cleanArgs = packageName ? [packageName] : ["--all"];
  await execCommand("bun", ["./scripts/clean.mjs", ...cleanArgs]);
  logger.info("✅ Clean completed");

  // Step 2: Bundle
  logger.info("Step 2/2: Building packages...");
  const bundleArgs = packageName ? [packageName] : ["--all"];
  await execCommand("bun", ["./scripts/bundle.mjs", ...bundleArgs, "--quiet"]);
  logger.info("✅ Bundle completed");
}

// Function to add a benchmark suite with config support
global.suite = (name, fn, customConfig = {}) => {
  const packageName = getCurrentPackageName(name);
  const effectiveConfig = {
    ...getEffectiveConfig(name, packageName),
    ...customConfig
  };

  const newSuite = new Suite(name);

  // Store config for later use in suite execution
  newSuite.benchmarkConfig = effectiveConfig;

  // Override suite.add to apply config to individual benchmarks
  const originalAdd = newSuite.add.bind(newSuite);
  newSuite.add = function (name, fn, options = {}) {
    const benchmarkOptions = {
      ...options,
      minSamples: effectiveConfig.minSamples || options.minSamples,
      maxTime: effectiveConfig.maxTime || options.maxTime,
      initCount: effectiveConfig.warmupRounds || options.initCount
    };

    return originalAdd(name, fn, benchmarkOptions);
  };

  fn(newSuite);
  suites.push(newSuite);
};

// Extract package name from suite name
function getCurrentPackageName(suiteName) {
  if (suiteName.startsWith('Core')) return 'core';
  if (suiteName.startsWith('CSS')) return 'css';
  if (suiteName.startsWith('DOM')) return 'dom';
  if (suiteName.startsWith('Resource')) return 'resource';
  if (suiteName.startsWith('Router')) return 'router';
  if (suiteName.startsWith('Store')) return 'store';
  return null;
}

// Parse command line arguments
const args = process.argv.slice(2);
const packageName = args[0];

try {
  // Load configuration first
  benchmarkConfig = await loadBenchmarkConfig();
  log.info(`Loaded benchmark configuration`);

  await preparePackages(packageName);

  log.info(`Starting benchmark runner for: ${packageName || 'all packages'}`);

  // Find all benchmark files
  const files = await findBenchmarkFiles(packageName, benchmarkType);

  if (files.length === 0) {
    log.warn(`No benchmark files found for: ${packageName || 'all packages'}`);
    process.exit(0);
  }

  log.info(`Found ${files.length} benchmark files: ${files.join(', ')}`);

  // Import all benchmark files to register the suites with parallel loading and error isolation
  log.info(`Loading ${files.length} benchmark files in parallel...`);

  const importPromises = files.map(async (file) => {
    try {
      log.info(`Loading benchmark file: ${file}`);
      await import(path.resolve(file));
      return { file, success: true };
    } catch (error) {
      log.error(`Failed to load benchmark file ${file}: ${error.message}`);
      return { file, success: false, error: error.message };
    }
  });

  const importResults = await Promise.all(importPromises);
  const failedImports = importResults.filter(result => !result.success);

  if (failedImports.length > 0) {
    log.error(`Failed to load ${failedImports.length}/${files.length} benchmark files:`);
    failedImports.forEach(({ file, error }) => {
      log.error(`  - ${file}: ${error}`);
    });

    const successfulImports = importResults.filter(result => result.success);
    if (successfulImports.length === 0) {
      log.error('No benchmark files loaded successfully. Exiting.');
      process.exit(1);
    } else {
      log.warn(`Continuing with ${successfulImports.length}/${files.length} successfully loaded benchmark files.`);
    }
  } else {
    log.info(`Successfully loaded all ${files.length} benchmark files.`);
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
  log.info('All suites completed. Writing results...');
  await writeResults();
  log.info(`Benchmark results written to ${benchmarkConfig.output.file}`);

} catch (error) {
  log.error(`Benchmark runner failed: ${error.message}`);
  process.exit(1);
}

/**
 * Find benchmark files using Node.js built-in APIs
 */
async function findBenchmarkFiles(packageName) {
  const files = [];

  if (packageName) {
    // Single package: benchmarks/{package}/*.bench.mjs
    const packageDir = path.join('benchmarks', packageName);
    try {
      const benchFiles = await fs.readdir(packageDir);
      return benchFiles
        .filter(file => file.endsWith('.bench.mjs'))
        .map(file => path.join(packageDir, file));
    } catch {
      return [];
    }
  } else {
    // All packages: benchmarks/**/*.bench.mjs (excluding browser/)
    try {
      const items = await fs.readdir('benchmarks');
      for (const item of items) {
        if (item === 'browser' || item.startsWith('.')) continue; // Skip browser and hidden files

        const itemPath = path.join('benchmarks', item);
        const stat = await fs.stat(itemPath);
        if (stat.isDirectory()) {
          try {
            const benchFiles = await fs.readdir(itemPath);
            files.push(
              ...benchFiles
                .filter(file => file.endsWith('.bench.mjs'))
                .map(file => path.join(itemPath, file))
            );
          } catch {
            // Skip directories we can't read
          }
        }
      }
    } catch {
      // Return empty if benchmarks dir doesn't exist
    }
  }

  return files;
}

/**
 * Write benchmark results in configured format
 */
async function writeResults() {
  const config = benchmarkConfig.output;

  let output = allBenchmarkResults;

  if (config.includeSystemInfo) {
    output = {
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
        totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
        timestamp: new Date().toISOString()
      },
      results: allBenchmarkResults
    };
  }

  if (config.format === 'csv') {
    const csvContent = convertToCSV(output);
    await fs.writeFile(config.file.replace('.json', '.csv'), csvContent);
  } else if (config.format === 'console') {
    console.log(JSON.stringify(output, null, config.precision));
  } else {
    await fs.writeFile(config.file, JSON.stringify(output, null, config.precision));
  }
}

/**
 * Convert results to CSV format
 */
function convertToCSV(data) {
  const results = data.results || data;
  let csv = 'Suite,Benchmark,Hz,RME,Samples\n';

  for (const [suiteName, benchmarks] of Object.entries(results)) {
    for (const benchmark of benchmarks) {
      csv += `"${suiteName}","${benchmark.name}",${benchmark.hz},${benchmark.rme},${benchmark.sample}\n`;
    }
  }

  return csv;
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
        async: suite.benchmarkConfig?.async ?? true,
        queued: suite.benchmarkConfig?.queued ?? true
      });
  });
}
