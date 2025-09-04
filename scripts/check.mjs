#!/usr/bin/env node
import fsStat from "node:fs";
import path from "node:path";
import {
	logger,
	execCommandInherited,
	isValidPackage,
	packagesDir,
	projectRoot,
	testsDir,
} from "./utils/index.js";

async function runCheck(packageName) {
	try {
		logger.info(`Running check for ${packageName ? packageName : "all packages"}...`);

		// Step 1: Clean
		logger.info("Step 1/3: Cleaning build artifacts...");
		const cleanArgs = packageName ? [packageName] : ["--all"];
		await execCommandInherited("bun", ["./scripts/clean.mjs", ...cleanArgs], { cwd: projectRoot });
		logger.info("Clean completed");

		// Step 2: Bundle
		logger.info("Step 2/3: Building packages...");
		const bundleArgs = packageName ? [packageName] : ["--all"];
		await execCommandInherited("bun", ["./scripts/bundle.mjs", ...bundleArgs, "--quiet"], { cwd: projectRoot });
		logger.info("Bundle completed");

		// Step 3: Test
		logger.info("Step 3/3: Running tests...");
		if (packageName) {
			// Run tests for specific package
			const testArgs = ["test"];

			// Check if package has a dedicated test directory
			const packageTestDir = path.join(testsDir, packageName);
			if (fsStat.existsSync(packageTestDir)) {
				testArgs.push(`tests/${packageName}`);
			} else {
				// Check if package has a dedicated test file
				const packageTestFile = path.join(testsDir, `${packageName}.test.ts`);
				if (fsStat.existsSync(packageTestFile)) {
					testArgs.push(`tests/${packageName}.test.ts`);
				} else {
					logger.info(`No specific tests found for ${packageName}, running all tests`);
				}
			}

			// Check if there's a plugin test file for this package
			const pluginTestFile = path.join(projectRoot, "plugins", packageName, `${packageName}.test.js`);
			if (fsStat.existsSync(pluginTestFile)) {
				testArgs.push(`plugins/${packageName}/${packageName}.test.js`);
			}

			await execCommandInherited("bun", testArgs, { cwd: projectRoot });
		} else {
			// Run all tests including plugin tests
			await execCommandInherited("bun", ["test", "tests/", "plugins/"], { cwd: projectRoot });
		}
		logger.success(`Check completed successfully for ${packageName ? packageName : "all packages"}`);
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
			if (!isValidPackage(packageName)) {
				logger.error(`Package "${packageName}" not found or invalid`);
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