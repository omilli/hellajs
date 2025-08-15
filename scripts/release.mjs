#!/usr/bin/env node
import { execSync } from "child_process";
import { logger } from "./utils/common.js";
import {
	getAllPackages,
	getPackagePath,
	getPackagesWithChangesets,
} from "./utils/packages.js";
import { addPreviewOperation, createResult } from "./utils/validation.js";
import {
	bumpVersion,
	getPackageVersion,
	parseChangesetBumps,
	updatePeerDependencies,
} from "./utils/versions.js";

/**
 * HellaJS Publishing Script
 *
 * Core publishing workflow with dry-run support:
 * 1. Update package versions with changeset
 * 2. Update peer dependencies
 * 3. Publish packages
 *
 * Usage:
 *   node scripts/release.mjs           # Publish
 *   node scripts/release.mjs --dry-run # Preview only
 */

/**
 * Parse command line arguments
 */
function parseArgs() {
	const args = process.argv.slice(2);
	return {
		dryRun: args.includes("--dry-run") || args.includes("--preview"),
	};
}

/**
 * Simulate changeset version to predict new versions
 */
function simulateChangesetVersion() {
	const packagesWithChanges = getPackagesWithChangesets();
	const packageBumps = parseChangesetBumps();
	const predictedVersions = new Map();

	logger.info("[DRY-RUN] Simulating changeset version...");

	for (const packageName of packagesWithChanges) {
		const packagePath = getPackagePath(packageName);
		if (packagePath) {
			const currentVersion = getPackageVersion(packagePath);
			if (currentVersion) {
				const bumpType = packageBumps.get(packageName) || "patch";
				const newVersion = bumpVersion(currentVersion, bumpType);
				predictedVersions.set(packageName, newVersion);
				logger.info(
					`[DRY-RUN] ${packageName}: ${currentVersion} → ${newVersion} (${bumpType})`,
				);
			}
		}
	}

	return predictedVersions;
}

/**
 * Display preview summary
 */
function displayPreviewSummary(packageVersions, previewOperations) {
	logger.info("\n" + "=".repeat(60));
	logger.info("🔍 DRY-RUN PREVIEW SUMMARY");
	logger.info("=".repeat(60));

	logger.info("\n📦 PACKAGES TO BE PUBLISHED:");
	if (packageVersions.size === 0) {
		logger.info("  No packages will be published");
	} else {
		for (const [name, version] of packageVersions) {
			logger.info(`  ${name}@${version}`);
		}
	}

	logger.info("\n🔄 OPERATIONS THAT WOULD BE PERFORMED:");
	logger.info("1. Run 'changeset version' to update package.json files");

	if (previewOperations.length > 0) {
		for (let i = 0; i < previewOperations.length; i++) {
			const op = previewOperations[i];
			logger.info(`${i + 2}. ${op.description}`);

			if (op.details.changes) {
				for (const change of op.details.changes) {
					logger.info(
						`   - ${change.type}: ${change.dependency} (${change.from} → ${change.to})`,
					);
				}
			}
		}
		logger.info(
			`${previewOperations.length + 2}. Run 'changeset publish' to publish packages to NPM`,
		);
	} else {
		logger.info("2. Run 'changeset publish' to publish packages to NPM");
	}

	logger.info(
		"\n⚠️  NOTE: This is a preview only. No files will be modified and no packages will be published.",
	);
	logger.info(
		"To perform the actual release, run this script without the --dry-run flag.",
	);
	logger.info("=".repeat(60));
}

/**
 * Basic validation for publishing readiness
 */
function validateForPublishing() {
	logger.info("Validating publishing readiness...");

	const packages = getAllPackages();
	const errors = [];

	for (const pkg of packages) {
		if (pkg.packageJson.private === true) continue;

		// Check for basic peer dependency format
		if (pkg.packageJson.peerDependencies) {
			for (const [depName, depVersion] of Object.entries(
				pkg.packageJson.peerDependencies,
			)) {
				if (depName === "@hellajs/core" && !depVersion.startsWith("^")) {
					errors.push(
						`Invalid core peer dependency version in ${pkg.name}: ${depVersion}`,
					);
				}
			}
		}
	}

	if (errors.length > 0) {
		logger.error("Validation failed:");
		for (const error of errors) {
			logger.error(error);
		}
		return false;
	}

	logger.info("✅ Validation passed");
	return true;
}

/**
 * Main publishing workflow
 */
async function publish(dryRun) {
	const result = createResult();
	const modeText = dryRun ? " (DRY-RUN MODE)" : "";
	logger.info(`🚀 Starting HellaJS publishing${modeText}...`);

	// Basic validation
	if (!validateForPublishing()) {
		process.exit(1);
	}

	// Get packages that need to be published
	const packagesWithChanges = getPackagesWithChangesets();
	if (packagesWithChanges.length === 0) {
		logger.info("No packages have changesets - nothing to publish");
		if (dryRun) {
			displayPreviewSummary(new Map(), result.previewOperations);
		}
		return;
	}

	logger.info(`Packages with changesets: ${packagesWithChanges.join(", ")}`);

	let packageVersions;

	if (dryRun) {
		// Simulate changeset version
		packageVersions = simulateChangesetVersion();
	} else {
		// Run changeset version to update all package versions
		logger.info("Updating package versions with changeset...");
		try {
			execSync("changeset version", { stdio: "inherit" });
		} catch (error) {
			logger.error("Failed to update versions with changeset", error);
			process.exit(1);
		}

		// Get the new versions after changeset version
		packageVersions = new Map();
		for (const packageName of packagesWithChanges) {
			const packagePath = getPackagePath(packageName);
			if (packagePath) {
				const version = getPackageVersion(packagePath);
				if (version) {
					packageVersions.set(packageName, version);
					logger.info(`${packageName} will be published as v${version}`);
				}
			}
		}
	}

	// Update peer dependencies with new versions
	if (packageVersions.has("@hellajs/core")) {
		const coreVersion = packageVersions.get("@hellajs/core");
		const updateMessage = dryRun ? "[DRY-RUN] Would update" : "Updating";
		logger.info(
			`${updateMessage} @hellajs/core peer dependencies to v${coreVersion}...`,
		);

		const coreDepPackages = [
			"@hellajs/dom",
			"@hellajs/store",
			"@hellajs/resource",
			"@hellajs/router",
		];
		for (const pkgName of coreDepPackages) {
			const pkgPath = getPackagePath(pkgName);
			if (pkgPath) {
				const updateResult = updatePeerDependencies(
					pkgPath,
					{ "@hellajs/core": coreVersion },
					dryRun,
				);
				if (dryRun && updateResult.changed) {
					addPreviewOperation(
						result,
						"update_dependencies",
						`Update dependencies in ${pkgName.replace("@hellajs/", "")}`,
						{
							changes: updateResult.changes,
						},
					);
				}
			}
		}
	}

	if (packageVersions.has("babel-plugin-hellajs")) {
		const babelVersion = packageVersions.get("babel-plugin-hellajs");
		const updateMessage = dryRun ? "[DRY-RUN] Would update" : "Updating";
		logger.info(
			`${updateMessage} babel-plugin-hellajs dependencies to v${babelVersion}...`,
		);

		const pluginDepPackages = ["vite-plugin-hellajs", "rollup-plugin-hellajs"];
		for (const pkgName of pluginDepPackages) {
			const pkgPath = getPackagePath(pkgName);
			if (pkgPath) {
				const updateResult = updatePeerDependencies(
					pkgPath,
					{ "babel-plugin-hellajs": babelVersion },
					dryRun,
				);
				if (dryRun && updateResult.changed) {
					addPreviewOperation(
						result,
						"update_dependencies",
						`Update dependencies in ${pkgName}`,
						{
							changes: updateResult.changes,
						},
					);
				}
			}
		}
	}

	if (dryRun) {
		displayPreviewSummary(packageVersions, result.previewOperations);
		return;
	}

	// Publish packages
	logger.info("Publishing packages with changeset...");
	try {
		execSync("changeset publish", { stdio: "inherit" });
		logger.info("✅ Publishing completed successfully!");

		logger.info("Published packages:");
		for (const [name, version] of packageVersions) {
			logger.info(`  ${name}@${version}`);
		}
	} catch (error) {
		logger.error("Failed to publish with changeset", error);
		process.exit(1);
	}
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
	const args = parseArgs();

	if (args.dryRun) {
		logger.info("🔍 Running in DRY-RUN mode - no files will be modified");
	}

	await publish(args.dryRun);
}

// Export functions for reuse
export { parseArgs, simulateChangesetVersion, displayPreviewSummary, publish };
