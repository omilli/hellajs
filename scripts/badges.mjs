#!/usr/bin/env node
import fs from "node:fs/promises";
import fsStat from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./utils/common.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
	let readmeContent = await fs.readFile(readmePath, "utf8");
	
	// Regex to match bundle size badge with version
	const badgeRegex = new RegExp(
		`(https://deno\\.bundlejs\\.com/badge\\?q=@hellajs/${packageName}@)([^&]+)(&treeshake=\\[\\*\\])`,
		"g"
	);
	
	// Check if badge exists and needs updating
	const matches = readmeContent.match(badgeRegex);
	if (!matches) {
		return false;
	}
	
	// Extract current version from badge
	const badgeMatch = badgeRegex.exec(readmeContent);
	if (!badgeMatch) {
		return false;
	}
	
	const currentBadgeVersion = badgeMatch[2];
	
	// Skip if versions already match
	if (currentBadgeVersion === currentVersion) {
		return false;
	}
	
	// Update badge with new version
	const updatedContent = readmeContent.replace(
		badgeRegex,
		`$1${currentVersion}$3`
	);
	
	// Write updated content
	await fs.writeFile(readmePath, updatedContent, "utf8");
	
	logger.info(`Updated badge ${packageName}: ${currentBadgeVersion} → ${currentVersion}`);
	return true;
}

async function main() {
	try {
		logger.info("🏷️  Updating bundle size badges...");
		
		if (!fsStat.existsSync(packagesDir)) {
			logger.error("Packages directory not found");
			process.exit(1);
		}
		
		const packages = (await fs.readdir(packagesDir)).filter(pkg => {
			const pkgDir = path.join(packagesDir, pkg);
			return fsStat.statSync(pkgDir).isDirectory() && 
				   fsStat.existsSync(path.join(pkgDir, "package.json"));
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
			logger.info(`✅ Updated ${totalUpdated} badge${totalUpdated !== 1 ? 's' : ''}`);
		}
		
	} catch (error) {
		logger.error("Badge update failed", { error: error.message });
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== 'test') {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}