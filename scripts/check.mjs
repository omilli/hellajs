#!/usr/bin/env node
import fsStat from "node:fs";
import path from "node:path";
import {
	logger,
	execCommandInherited,
	isValidPackage,
	packagesDir,
	projectRoot,
} from "./utils/index.js";

async function runCheck(packageName) {
	try {
		logger.info(`Running check for ${packageName ? packageName : "all packages"}...`);

		// Bundle
		logger.info("Step 2/3: Building packages...");
		const bundleArgs = packageName ? [packageName] : [];
		await execCommandInherited("bun", ["./scripts/bundle.mjs", ...bundleArgs, "--quiet"], { cwd: projectRoot });
		logger.info("Bundle completed");

		// Test
		logger.info("Step 3/3: Running tests...");
		if (packageName) {
			// Run tests for specific package
			const testArgs = ["test"];

			// Check if package has a dedicated test directory
			const packageTestDir = path.join(packagesDir, packageName, "tests");
			if (fsStat.existsSync(packageTestDir)) {
				testArgs.push(`packages/${packageName}/tests`);
			} else {
				// Check if package has a dedicated test file
				const packageTestFile = path.join(packagesDir, packageName, "tests", `${packageName}.test.ts`);
				if (fsStat.existsSync(packageTestFile)) {
					testArgs.push(`packages/${packageName}/tests/${packageName}.test.ts`);
				} else {
					logger.info(`No specific tests found for ${packageName}, running all tests`);
				}
			}

			// Check if there's a plugin test file for this package
			const pluginTestFile = path.join(projectRoot, "plugins", packageName, `${packageName}.test.ts`);
			if (fsStat.existsSync(pluginTestFile)) {
				testArgs.push(`plugins/${packageName}/${packageName}.test.ts`);
			}

			await execCommandInherited("bun", testArgs, { cwd: projectRoot });
		} else {
			// Run all tests including plugin tests
			await execCommandInherited("bun", ["test", "packages/core/tests/", "packages/dom/tests/", "packages/store/tests/", "packages/resource/tests/", "packages/router/tests/", "packages/css/tests/", "plugins/", "docs/src/pages/learn/"], { cwd: projectRoot });
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
		const packageName = args.find((arg) => !arg.startsWith("--"));

		if (!fsStat.existsSync(packagesDir)) {
			logger.error("Packages directory not found");
			process.exit(1);
		}

		if (packageName) {
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