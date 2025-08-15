#!/usr/bin/env node
import { execSync } from "child_process";
import { logger } from "./utils/common.js";
import {
	getAllPackages,
	getPackagePath,
} from "./utils/packages.js";
import { updatePeerDependencies } from "./utils/versions.js";

/**
 * HellaJS Publishing Script
 *
 * This script is designed to be run by the `changesets/action` in a CI environment.
 * It handles updating peer dependencies, committing the changes, and publishing packages.
 */

async function publish() {
	logger.info("🚀 Starting HellaJS publishing...");

	const allPackages = getAllPackages();
	const packageVersions = new Map(
		allPackages.map((p) => [p.name, p.version]),
	);

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

	// Commit the peer dependency updates
	try {
		const status = execSync("git status --porcelain").toString();
		if (status) {
			logger.info("Committing peer dependency updates...");
			execSync('git config --local user.email "action@github.com"');
			execSync('git config --local user.name "GitHub Action"');
			execSync("git add ./**/package.json");
			execSync("git commit -m 'chore: update peer dependencies' --no-verify");
		} else {
			logger.info("No peer dependency changes to commit.");
		}
	} catch (error) {
		logger.warn("Failed to amend commit with peer dependency updates.", error);
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
