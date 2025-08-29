import path from 'path';
import fs from 'fs/promises';

// Parse command line arguments
const args = process.argv.slice(2);
const packageName = args[0];

console.log(`Running benchmarks for: ${packageName || 'all packages'}`);

try {
  // Find all benchmark files
  const files = await findBenchmarkFiles(packageName);

  if (files.length === 0) {
    console.warn(`No benchmark files found for: ${packageName || 'all packages'}`);
    process.exit(0);
  }

  console.log(`Found ${files.length} benchmark files: ${files.join(', ')}`);

  // Import all benchmark files to run them
  for (const file of files) {
    console.log(`Running benchmark file: ${file}`);
    await import(path.resolve(file));
  }

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