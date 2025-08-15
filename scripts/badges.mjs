#!/usr/bin/env node
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

async function updatePackageBadge(packageName) {
	const packageDir = path.join(packagesDir, packageName);
	const packageJsonPath = path.join(packageDir, "package.json");
	const readmePath = path.join(packageDir, "README.md");

	// Check if files exist
	if (!fsStat.existsSync(packageJsonPath) || !fsStat.existsSync(readmePath)) {
		return false;
	}

	// Get current version from package.json
	const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
	const currentVersion = packageJson.version;

	if (!currentVersion) {
		logger.warn(`No version found in ${packageName}/package.json`);
		return false;
	}

	// Read README content
	const readmeContent = await fs.readFile(readmePath, "utf8");

	// Regex to match bundle size badge with version
	const badgeRegex = new RegExp(
		`(https://edge\\.bundlejs\\.com/badge\\?q=@hellajs/${packageName}@)([^&]+)(&treeshake=\\[\\*\\])`,
		"g",
	);

	// Check if badge exists and needs updating (check both edge and deno subdomains)
	const denoRegex = new RegExp(
		`(https://deno\\.bundlejs\\.com/badge\\?q=@hellajs/${packageName}@)([^&]+)(&treeshake=\\[\\*\\])`,
		"g",
	);
	
	const edgeMatches = readmeContent.match(badgeRegex);
	const denoMatches = readmeContent.match(denoRegex);
	
	if (!edgeMatches && !denoMatches) {
		return false;
	}

	// Extract current version from badge
	let currentBadgeVersion;
	if (edgeMatches) {
		const badgeMatch = badgeRegex.exec(readmeContent);
		currentBadgeVersion = badgeMatch ? badgeMatch[2] : null;
	} else {
		const badgeMatch = denoRegex.exec(readmeContent);
		currentBadgeVersion = badgeMatch ? badgeMatch[2] : null;
	}
	
	if (!currentBadgeVersion) {
		return false;
	}

	// Skip if versions already match
	if (currentBadgeVersion === currentVersion) {
		return false;
	}

	// Update badge with new version (also handle both deno and edge subdomains)
	const updatedContent = readmeContent
		.replace(badgeRegex, `$1${currentVersion}$3`)
		.replace(
			new RegExp(
				`(https://deno\\.bundlejs\\.com/badge\\?q=@hellajs/${packageName}@)([^&]+)(&treeshake=\\[\\*\\])`,
				"g",
			),
			`https://edge.bundlejs.com/badge?q=@hellajs/${packageName}@${currentVersion}&treeshake=[*]`,
		);

	// Write updated content
	await fs.writeFile(readmePath, updatedContent, "utf8");

	logger.info(
		`Updated badge ${packageName}: ${currentBadgeVersion} → ${currentVersion}`,
	);
	return true;
}

async function main() {
	try {
		logger.info("🏷️  Updating bundle size badges...");

		if (!fsStat.existsSync(packagesDir)) {
			logger.error("Packages directory not found");
			process.exit(1);
		}

		const packages = (await fs.readdir(packagesDir)).filter((pkg) => {
			const pkgDir = path.join(packagesDir, pkg);
			return (
				fsStat.statSync(pkgDir).isDirectory() &&
				fsStat.existsSync(path.join(pkgDir, "package.json"))
			);
		});

		let totalUpdated = 0;

		for (const pkg of packages) {
			if (await updatePackageBadge(pkg)) {
				totalUpdated++;
			}
		}

		if (totalUpdated === 0) {
			logger.info("✨ All badges up to date");
		} else {
			logger.info(
				`✅ Updated ${totalUpdated} badge${totalUpdated !== 1 ? "s" : ""}`,
			);
		}
	} catch (error) {
		logger.error("Badge update failed", { error: error.message });
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== "test") {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
