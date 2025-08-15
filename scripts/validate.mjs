#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { logger } from "./utils/common.js";
import { getAllPackages } from "./utils/packages.js";
import {
	addError,
	addWarning,
	createValidationResult,
} from "./utils/validation.js";

/**
 * HellaJS Validation Script
 *
 * Essential pre-publish validation:
 * 1. Dependency consistency validation
 * 2. Package structure validation
 * 3. Publishing readiness validation
 *
 * Usage:
 *   node scripts/validate.mjs        # Run all validations
 */

/**
 * Validate dependency consistency across the monorepo
 */
function validateDependencyConsistency(result) {
	logger.info("Validating dependency consistency...");

	const packages = getAllPackages();
	const allDependencies = new Map(); // dep name -> versions used

	// Collect all dependencies
	for (const pkg of packages) {
		const deps = [
			...(pkg.packageJson.dependencies
				? Object.entries(pkg.packageJson.dependencies)
				: []),
			...(pkg.packageJson.peerDependencies
				? Object.entries(pkg.packageJson.peerDependencies)
				: []),
			...(pkg.packageJson.devDependencies
				? Object.entries(pkg.packageJson.devDependencies)
				: []),
		];

		for (const [depName, depVersion] of deps) {
			if (!allDependencies.has(depName)) {
				allDependencies.set(depName, new Set());
			}
			allDependencies.get(depName).add(`${depVersion} (in ${pkg.name})`);
		}
	}

	// Check for version inconsistencies
	for (const [depName, versions] of allDependencies) {
		const uniqueVersions = new Set();
		for (const versionInfo of versions) {
			const version = versionInfo.split(" (in ")[0];
			uniqueVersions.add(version);
		}

		if (uniqueVersions.size > 1) {
			addWarning(
				result,
				`Inconsistent versions for ${depName}: ${Array.from(versions).join(", ")}`,
			);
		}
	}

	// Validate core peer dependencies
	const corePackage = packages.find((pkg) => pkg.name === "@hellajs/core");
	if (corePackage) {
		const coreDependentPackages = packages.filter(
			(pkg) =>
				pkg.packageJson.peerDependencies &&
				pkg.packageJson.peerDependencies["@hellajs/core"],
		);

		for (const pkg of coreDependentPackages) {
			const coreVersion = pkg.packageJson.peerDependencies["@hellajs/core"];
			if (!coreVersion.startsWith("^")) {
				addError(
					result,
					`Invalid core peer dependency version in ${pkg.name}: ${coreVersion} (should start with ^)`,
				);
			}
		}
	}

	return result;
}

/**
 * Validate package.json structure and required fields
 */
function validatePackageStructure(result) {
	logger.info("Validating package structure...");

	const packages = getAllPackages();
	const requiredFields = ["name", "version", "type"];

	for (const pkg of packages) {
		// Check required fields
		for (const field of requiredFields) {
			if (!pkg.packageJson[field]) {
				addError(result, `Missing required field '${field}' in ${pkg.name}`);
			}
		}

		// Validate exports field if present
		if (pkg.packageJson.exports) {
			if (!pkg.packageJson.exports["."]) {
				addError(
					result,
					`Invalid exports field in ${pkg.name}: missing '.' entry`,
				);
			}
		}

		// Check for dist files (packages) or built files (plugins)
		const distPath = path.join(pkg.path, "dist");
		const hasBuiltFiles =
			pkg.type === "plugin"
				? fs.existsSync(path.join(pkg.path, "index.mjs"))
				: fs.existsSync(distPath);

		if (!hasBuiltFiles) {
			addWarning(
				result,
				`No ${pkg.type === "plugin" ? "built files" : "dist directory"} found for ${pkg.name} (may need to build)`,
			);
		}
	}

	return result;
}

/**
 * Validate publishing readiness
 */
function validatePublishingReadiness(result) {
	logger.info("Validating publishing readiness...");

	const packages = getAllPackages();

	for (const pkg of packages) {
		if (pkg.packageJson.private === true) continue;

		// Check for built files
		const distPath = path.join(pkg.path, "dist");
		const hasBuiltFiles =
			pkg.type === "plugin"
				? fs.existsSync(path.join(pkg.path, "index.mjs"))
				: fs.existsSync(distPath);

		if (!hasBuiltFiles) {
			addError(
				result,
				`Package ${pkg.name} is missing ${pkg.type === "plugin" ? "built files" : "dist directory"} - run build first`,
			);
			continue;
		}

		// Check for main/exports fields pointing to existing files
		if (pkg.packageJson.main) {
			const mainFile = path.join(pkg.path, pkg.packageJson.main);
			if (!fs.existsSync(mainFile)) {
				addError(
					result,
					`Package ${pkg.name} main file does not exist: ${pkg.packageJson.main}`,
				);
			}
		}

		if (pkg.packageJson.exports && pkg.packageJson.exports["."]) {
			const exportEntry = pkg.packageJson.exports["."];
			if (typeof exportEntry === "string") {
				const exportFile = path.join(pkg.path, exportEntry);
				if (!fs.existsSync(exportFile)) {
					addError(
						result,
						`Package ${pkg.name} export file does not exist: ${exportEntry}`,
					);
				}
			} else if (exportEntry.import) {
				const importFile = path.join(pkg.path, exportEntry.import);
				if (!fs.existsSync(importFile)) {
					addError(
						result,
						`Package ${pkg.name} import file does not exist: ${exportEntry.import}`,
					);
				}
			}
		}
	}

	return result;
}

/**
 * Run all validations
 */
async function validateAll() {
	logger.info("Starting HellaJS validation...");

	const result = createValidationResult();

	validateDependencyConsistency(result);
	validatePackageStructure(result);
	validatePublishingReadiness(result);

	// Summary
	const totalIssues = result.errors.length + result.warnings.length;

	if (totalIssues === 0) {
		logger.info("✅ All validations passed!");
		return { success: true, result };
	} else {
		logger.info(`📊 Validation Summary:`);
		logger.info(`  Errors: ${result.errors.length}`);
		logger.info(`  Warnings: ${result.warnings.length}`);

		if (result.errors.length > 0) {
			logger.error("❌ Validation failed due to errors:");
			for (const error of result.errors) {
				logger.error(`  • ${error}`);
			}
		}

		if (result.warnings.length > 0) {
			logger.warn("⚠️  Warnings (recommended to fix):");
			for (const warning of result.warnings) {
				logger.warn(`  • ${warning}`);
			}
		}

		return { success: result.errors.length === 0, result };
	}
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
	const { success } = await validateAll();
	process.exit(success ? 0 : 1);
}

export {
	validateDependencyConsistency,
	validatePackageStructure,
	validatePublishingReadiness,
	validateAll,
};
