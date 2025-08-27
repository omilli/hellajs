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
	const sizesPath = path.join(packageDir, "dist", "sizes.json");

	// Check if files exist
	if (!fsStat.existsSync(packageJsonPath) || !fsStat.existsSync(readmePath)) {
		return false;
	}

	// Generate size data if it doesn't exist
	if (!fsStat.existsSync(sizesPath)) {
		logger.info(`Generating size data for ${packageName}...`);
		const { execSync } = await import("node:child_process");
		try {
			// Clean first, then build with size mode
			execSync(`bun scripts/clean.mjs ${packageName}`, {
				cwd: projectRoot,
				stdio: "inherit",
			});
			
			// Build core first if this package depends on it and core isn't this package
			if (packageName !== 'core') {
				const coreDistPath = path.join(projectRoot, 'packages', 'core', 'dist');
				if (!fsStat.existsSync(coreDistPath) || !fsStat.existsSync(path.join(coreDistPath, 'core.js'))) {
					logger.info(`Building core dependency first...`);
					execSync(`bun scripts/bundle.mjs core --size-mode`, {
						cwd: projectRoot,
						stdio: "inherit",
					});
				}
			}
			
			execSync(`bun scripts/bundle.mjs ${packageName} --size-mode`, {
				cwd: projectRoot,
				stdio: "inherit",
			});
		} catch (error) {
			logger.error(`Failed to generate size data for ${packageName}:`, error.message);
			return false;
		}
		
		// Check again after generation
		if (!fsStat.existsSync(sizesPath)) {
			logger.error(`Size data still not found after build for ${packageName}`);
			return false;
		}
	}

	// Read size data
	const sizeData = JSON.parse(await fs.readFile(sizesPath, "utf8"));
	const { bundleSize, gzipSize } = sizeData;

	if (!bundleSize || !gzipSize) {
		logger.warn(`Invalid size data for ${packageName}`);
		return false;
	}

	// Read README content
	const readmeContent = await fs.readFile(readmePath, "utf8");

	// Generate size badge text
	const sizeBadgeText = `![Bundle Size](https://img.shields.io/badge/bundle-${bundleSize}KB-brightgreen) ![Gzipped Size](https://img.shields.io/badge/gzipped-${gzipSize}KB-blue)`;

	// Regex to match existing bundle size badges (both old bundlejs.com and new format)
	const oldBadgeRegex = new RegExp(
		`!\\[Bundle Size\\]\\(https://(edge|deno)\\.bundlejs\\.com/badge\\?q=@hellajs/${packageName}@[^)]+\\)`,
		"g",
	);

	// Regex to match new format badges
	const newBadgeRegex = new RegExp(
		`!\\[Bundle Size\\]\\(https://img\\.shields\\.io/badge/bundle-[^)]+\\)\\s*!\\[Gzipped Size\\]\\(https://img\\.shields\\.io/badge/gzipped-[^)]+\\)`,
		"g",
	);

	let updatedContent = readmeContent;
	let wasUpdated = false;

	// Replace old bundlejs.com badges
	if (oldBadgeRegex.test(readmeContent)) {
		updatedContent = updatedContent.replace(oldBadgeRegex, sizeBadgeText);
		wasUpdated = true;
	}

	// Replace existing new format badges
	else if (newBadgeRegex.test(readmeContent)) {
		updatedContent = updatedContent.replace(newBadgeRegex, sizeBadgeText);
		wasUpdated = true;
	}

	if (!wasUpdated) {
		return false;
	}

	// Write updated content
	await fs.writeFile(readmePath, updatedContent, "utf8");

	logger.info(
		`Updated size badge ${packageName}: ${bundleSize}KB (${gzipSize}KB gzipped)`,
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
		let missingData = 0;

		for (const pkg of packages) {
			const result = await updatePackageBadge(pkg);
			if (result === true) {
				totalUpdated++;
			} else if (result === false) {
				const sizesPath = path.join(packagesDir, pkg, "dist", "sizes.json");
				if (!fsStat.existsSync(sizesPath)) {
					missingData++;
				}
			}
		}

		if (missingData > 0) {
			logger.warn(`⚠️  ${missingData} package${missingData !== 1 ? "s" : ""} missing size data. Run 'bun bundle --all --size-mode' first.`);
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
