#!/usr/bin/env node
import { execSync } from "child_process";
import { logger } from "./utils/common.js";
import { getPackagePath } from "./utils/packages.js";
import { updatePeerDependencies } from "./utils/versions.js";

/**
 * HellaJS Publishing Script
 *
 * This script is designed to be run by the `changesets/action` in a CI environment.
 * It handles updating peer dependencies and publishing packages.
 *
 * Usage (within CI):
 *   node scripts/release.mjs
 */

/**
 * Get release information from changeset status
 */
function getReleaseInfo() {
	try {
		const jsonOutput = execSync("changeset status --json", {
			encoding: "utf8",
		});
		const data = JSON.parse(jsonOutput);
		if (data && data.releases) {
			return data.releases;
		}
		return [];
	} catch (error) {
		logger.error("Failed to get changeset status", error);
		process.exit(1);
	}
}

/**
 * Main publishing workflow
 */
async function publish() {
	logger.info("🚀 Starting HellaJS publishing...");

	const releases = getReleaseInfo();
	if (releases.length === 0) {
		logger.info("No packages to publish according to changeset status.");
		return;
	}

	const packageVersions = new Map(
		releases.map((r) => [r.name, r.newVersion]),
	);

	logger.info("Packages to be published:");
	for (const [name, version] of packageVersions) {
		logger.info(`  ${name}@${version}`);
	}

	// Update peer dependencies with new versions
	if (packageVersions.has("@hellajs/core")) {
		const coreVersion = packageVersions.get("@hellajs/core");
		logger.info(
			`Updating @hellajs/core peer dependencies to v${coreVersion}...`,
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
				updatePeerDependencies(pkgPath, { "@hellajs/core": coreVersion });
			}
		}
	}

	if (packageVersions.has("babel-plugin-hellajs")) {
		const babelVersion = packageVersions.get("babel-plugin-hellajs");
		logger.info(
			`Updating babel-plugin-hellajs dependencies to v${babelVersion}...`,
		);

		const pluginDepPackages = ["vite-plugin-hellajs", "rollup-plugin-hellajs"];
		for (const pkgName of pluginDepPackages) {
			const pkgPath = getPackagePath(pkgName);
			if (pkgPath) {
				updatePeerDependencies(pkgPath, {
					"babel-plugin-hellajs": babelVersion,
				});
			}
		}
	}

	// Publish packages
	logger.info("Publishing packages with changeset...");
	try {
		execSync("changeset publish", { stdio: "inherit" });
		logger.info("✅ Publishing completed successfully!");
	} catch (error) {
		logger.error("Failed to publish with changeset", error);
		process.exit(1);
	}
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
	await publish();
}