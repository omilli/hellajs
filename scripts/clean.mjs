#!/usr/bin/env node
import fs from "node:fs/promises";
import fsStat from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./utils/common.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packagesDir = path.join(projectRoot, "packages");

async function cleanPackage(packageName) {
	const packageDir = path.join(packagesDir, packageName);
	const distDir = path.join(packageDir, "dist");
	const cacheDir = path.join(packageDir, ".build-cache");

	const removedFolders = [];

	// Remove dist folder
	if (fsStat.existsSync(distDir)) {
		await fs.rm(distDir, { recursive: true, force: true });
		removedFolders.push("dist");
	}

	// Remove build cache folder  
	if (fsStat.existsSync(cacheDir)) {
		await fs.rm(cacheDir, { recursive: true, force: true });
		removedFolders.push(".build-cache");
	}

	if (removedFolders.length > 0) {
		logger.info(`Removed ${removedFolders.join(" & ")} for ${packageName}`);
		return true;
	}

	return false;
}

async function main() {
	try {
		logger.info("🧹 Cleaning build artifacts...");

		if (!fsStat.existsSync(packagesDir)) {
			logger.error("Packages directory not found");
			process.exit(1);
		}

		const packages = (await fs.readdir(packagesDir)).filter(pkg => {
			const pkgDir = path.join(packagesDir, pkg);
			return fsStat.statSync(pkgDir).isDirectory() &&
				fsStat.existsSync(path.join(pkgDir, "package.json"));
		});

		let totalCleaned = 0;

		for (const pkg of packages) {
			if (await cleanPackage(pkg)) {
				totalCleaned++;
			}
		}

		if (totalCleaned === 0) {
			logger.info("✨ Already clean - no artifacts found");
		} else {
			logger.final(`Cleaned ${totalCleaned} package${totalCleaned !== 1 ? 's' : ''}`, 0);
		}

	} catch (error) {
		logger.error("Clean failed", { error: error.message });
		process.exit(1);
	}
}

if (process.env.NODE_ENV !== 'test') {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}