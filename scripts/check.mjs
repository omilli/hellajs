#!/usr/bin/env node
import { spawn } from "node:child_process";
import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./utils/common.js";

const projectRoot = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
);
const packagesDir = path.join(projectRoot, "packages");

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

async function runCheck(packageName) {
	try {
		logger.info(`🔍 Running check for ${packageName ? packageName : "all packages"}...`);

		// Step 1: Clean
		logger.info("Step 1/3: Cleaning build artifacts...");
		const cleanArgs = packageName ? [packageName] : ["--all"];
		await execCommand("bun", ["./scripts/clean.mjs", ...cleanArgs]);
		logger.info("✅ Clean completed");

		// Step 2: Bundle
		logger.info("Step 2/3: Building packages...");
		const bundleArgs = packageName ? [packageName] : ["--all"];
		await execCommand("bun", ["./scripts/bundle.mjs", ...bundleArgs, "--quiet"]);
		logger.info("✅ Bundle completed");

		// Step 3: Test
		logger.info("Step 3/3: Running tests...");
		if (packageName) {
			// Run tests for specific package
			const testArgs = ["test"];
			
			// Check if package has a dedicated test directory
			const packageTestDir = path.join(projectRoot, "tests", packageName);
			if (fsStat.existsSync(packageTestDir)) {
				testArgs.push(`tests/${packageName}`);
			} else {
				// Check if package has a dedicated test file
				const packageTestFile = path.join(projectRoot, "tests", `${packageName}.test.ts`);
				if (fsStat.existsSync(packageTestFile)) {
					testArgs.push(`tests/${packageName}.test.ts`);
				} else {
					logger.info(`No specific tests found for ${packageName}, running all tests`);
				}
			}
			
			await execCommand("bun", testArgs);
		} else {
			// Run all tests
			await execCommand("bun", ["test"]);
		}
		logger.info("✅ Tests completed");

		logger.final(`Check completed successfully for ${packageName ? packageName : "all packages"}`, 0);
	} catch (error) {
		logger.error(`Check failed: ${error.message}`);
		process.exit(1);
	}
}

async function main() {
	try {
		const args = process.argv.slice(2);
		const checkAll = args.includes("--all");
		const packageName = args.find((arg) => !arg.startsWith("--"));

		if (!fsStat.existsSync(packagesDir)) {
			logger.error("Packages directory not found");
			process.exit(1);
		}

		if (packageName && !checkAll) {
			// Validate package exists
			const packageDir = path.join(packagesDir, packageName);
			if (!fsStat.existsSync(packageDir)) {
				logger.error(`Package "${packageName}" not found`);
				process.exit(1);
			}

			if (!fsStat.existsSync(path.join(packageDir, "package.json"))) {
				logger.error(`Package "${packageName}" does not have a package.json`);
				process.exit(1);
			}

			await runCheck(packageName);
		} else {
			await runCheck();
		}
	} catch (error) {
		logger.error("Check script failed", { error: error.message });
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}