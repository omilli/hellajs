#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { logger } from "./utils/common.js";
import { getPackageDirectories } from "./utils/packages.js";
import { createTestResult } from "./utils/validation.js";

/**
 * HellaJS Testing Script
 * 
 * Basic testing functionality for packages:
 * - Run tests for individual packages or all packages
 * 
 * Usage:
 *   node scripts/version.mjs test-all    # Run all package tests
 */

const projectRoot = path.resolve(process.cwd());

/**
 * Run tests for a specific package
 */
function runTestsForPackage(pkg) {
  // Try ./tests/[pkg].test.js
  const testFile = path.resolve(projectRoot, "tests", `${pkg}.test.js`);
  if (fs.existsSync(testFile)) {
    logger.info(`Running tests: ${testFile}`);
    try {
      execSync(`bun test ${testFile}`, { stdio: "inherit" });
      return { success: true, message: `Tests passed for ${pkg}` };
    } catch (e) {
      const errorMsg = `Tests failed for ${pkg}`;
      logger.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  // Try ./tests/[pkg]/
  const testDir = path.resolve(projectRoot, "tests", pkg);
  if (fs.existsSync(testDir) && fs.statSync(testDir).isDirectory()) {
    logger.info(`Running tests in folder: ${testDir}`);
    try {
      execSync(`bun test ${testDir}`, { stdio: "inherit" });
      return { success: true, message: `Tests passed for ${pkg}` };
    } catch (e) {
      const errorMsg = `Tests failed for ${pkg}`;
      logger.error(errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  logger.info(`No tests found for ${pkg}`);
  return { success: true, message: `No tests found for ${pkg}` };
}

/**
 * Run all tests for all packages
 */
function runAllTests() {
  logger.info("Running all tests...");
  
  const result = createTestResult();
  const packages = getPackageDirectories();
  
  if (packages.length === 0) {
    logger.info("No packages found to test");
    return result;
  }
  
  for (const pkg of packages) {
    const testResult = runTestsForPackage(pkg);
    if (testResult.success) {
      result.passed++;
    } else {
      result.failed++;
      result.errors.push(testResult.message);
    }
  }
  
  return result;
}

/**
 * Main execution function
 */
function main() {
  const command = process.argv[2];

  if (command === "test-all") {
    const result = runAllTests();
    
    if (result.failed === 0) {
      logger.info("✅ All package tests passed");
      logger.info(`Summary: ${result.passed} packages tested successfully`);
      process.exit(0);
    } else {
      logger.error(`❌ ${result.failed} package(s) failed testing:`);
      for (const error of result.errors) {
        logger.error(`  • ${error}`);
      }
      process.exit(1);
    }
  } else {
    logger.info("Usage: node scripts/version.mjs test-all");
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// Export functions for reuse
export {
  runTestsForPackage,
  runAllTests,
  main
};