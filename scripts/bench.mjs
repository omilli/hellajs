import path from 'path';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import os from 'os';

// Parse command line arguments
const args = process.argv.slice(2);
const packageName = args[0];

console.log(`Running benchmarks for: ${packageName || 'all packages'}`);

// Load existing results or initialize new structure
let results = {
  systemInfo: {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
    timestamp: new Date().toISOString()
  },
  results: {}
};

// Try to load existing results
try {
  const existingResults = await fs.readFile('benchmarks/results.json', 'utf8');
  const existing = JSON.parse(existingResults);
  // Keep existing results but update system info
  results.results = existing.results || {};
  results.systemInfo = {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
    timestamp: new Date().toISOString()
  };
} catch {
  // File doesn't exist or is invalid, use new structure
}

try {
  // Find all benchmark files
  const files = await findBenchmarkFiles(packageName);

  if (files.length === 0) {
    console.warn(`No benchmark files found for: ${packageName || 'all packages'}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} benchmark files: ${files.join(', ')}`);

  // Run benchmark files and capture results
  for (const file of files) {
    console.log(`Running benchmark file: ${file}`);
    await runBenchmarkFile(file, results);
  }

  // Write results to JSON file
  await writeResults(results);

} catch (error) {
  console.error(`Benchmark runner failed: ${error.message}`);
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
    // All packages: benchmarks/**/*.bench.mjs
    try {
      const items = await fs.readdir('benchmarks');
      for (const item of items) {
        if (item.startsWith('.')) continue; // Skip hidden files

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
 * Run a benchmark file and capture its results
 */
async function runBenchmarkFile(filePath, results) {
  return new Promise((resolve, reject) => {
    const child = spawn('bun', [filePath], {
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd()
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      const output = data.toString();
      process.stdout.write(output); // Still show output to user
      stdout += output;
    });

    child.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output); // Still show errors to user
      stderr += output;
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Benchmark failed with code ${code}: ${stderr}`));
        return;
      }

      try {
        // Parse the benchmark output and extract results
        const benchmarkResults = parseBenchmarkOutput(stdout, filePath);

        // Get suite name from file path
        const pathParts = filePath.split(path.sep);
        const packageName = pathParts[pathParts.length - 2]; // benchmarks/{package}/{file}.bench.mjs
        const fileName = path.basename(filePath, '.bench.mjs');

        // Store results in nested structure
        if (!results.results[packageName]) {
          results.results[packageName] = {};
        }
        results.results[packageName][fileName] = benchmarkResults;

        resolve();
      } catch (error) {
        console.warn(`Failed to parse benchmark output for ${filePath}: ${error.message}`);
        resolve(); // Don't fail the entire process for parsing errors
      }
    });

    child.on('error', (error) => {
      reject(new Error(`Failed to run benchmark ${filePath}: ${error.message}`));
    });
  });
}

function parseBenchmarkOutput(output, filePath) {
  const lines = output.split('\n').filter(line => line.trim());
  const tests = [];
  let suiteName = '';

  for (const line of lines) {
    // Extract suite name from various patterns
    if (line.includes('Suite(') || line.includes('new Suite(')) {
      const match = line.match(/Suite\(['"]([^'"]+)['"]/);
      if (match) {
        suiteName = match[1];
      }
    }

    // Parse benchmark result lines (format: "TestName x ops/sec ±deviation% (runs sampled)")
    const benchmarkMatch = line.match(/^(.+?)\sx\s([\d,]+(?:\.\d+)?)\sops\/sec\s±([\d.]+)%\s\((\d+)\sruns\ssampled\)/);
    if (benchmarkMatch) {
      const [, name, opsPerSec, deviation, runs] = benchmarkMatch;
      const ops = parseFloat(opsPerSec.replace(/,/g, ''));
      // Calculate mean time per operation in seconds
      const speed = ops > 0 ? (1 / ops) : 0;

      tests.push({
        name: name.trim(),
        opsPerSec: ops,
        deviation: parseFloat(deviation),
        runs: parseInt(runs),
        speed: speed // Mean time per operation with unit
      });
    }

    // Parse "Fastest is" line
    if (line.startsWith('Fastest is ')) {
      const fastestName = line.replace('Fastest is ', '').trim();
      // Mark the fastest test
      const fastestTest = tests.find(test => test.name === fastestName);
      if (fastestTest) {
        fastestTest.fastest = true;
      }
    }
  }

  return {
    suiteName: suiteName || path.basename(filePath, '.bench.mjs'),
    tests: tests
  };
}

/**
 * Write results to the benchmarks/results.json file
 */
async function writeResults(results) {
  const resultsPath = path.join('benchmarks', 'results.json');

  try {
    // Ensure benchmarks directory exists
    await fs.mkdir('benchmarks', { recursive: true });

    // Write results with pretty formatting
    await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

    console.log(`\nBenchmark results written to ${resultsPath}`);

    // Also log a summary
    console.log('\n=== Benchmark Summary ===');
    let totalTests = 0;
    for (const [packageName, packageResults] of Object.entries(results.results)) {
      console.log(`\n${packageName}:`);
      for (const [fileName, fileResults] of Object.entries(packageResults)) {
        console.log(`  ${fileName}: ${fileResults.tests.length} tests`);
        totalTests += fileResults.tests.length;
      }
    }
    console.log(`\nTotal: ${totalTests} benchmark tests completed\n`);

  } catch (error) {
    console.error(`Failed to write results: ${error.message}`);
  }
}