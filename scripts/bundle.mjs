import { createHash } from "node:crypto";
import fsStat from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { gzipSync } from "node:zlib";
import {
	ensureDir,
	scanDirRecursive,
	logger,
	execCommand,
	getPackageInfo,
	projectRoot,
	packagesDir,
} from "./utils/index.js";

const BUILD_CONFIG = {
	maxParallel: Math.min(os.cpus().length, 4),
	maxRetries: 2,
	buildTimeout: 120000,
	cacheDir: ".build-cache",
	enableCache: true,
	buildSteps: ["bundle", "browser", "declarations"],
};

const BUILD_ORDER = ["core", "css", "dom", "store", "router", "resource", "ui"];
const DEPENDENCY_GRAPH = {
	core: [],
	css: ["core"],
	dom: ["core"],
	store: ["core"],
	router: ["core"],
	resource: ["core"],
	ui: ["core", "css", "dom"],
};

const loggerFinal = (success, failedPackages) => {
	if (success) {
		logger.success("All packages built successfully!");
	} else {
		logger.error("Some packages failed to build:", failedPackages);
	}
};


async function calculateFileHash(filePath) {
	try {
		const content = await fs.readFile(filePath);
		return createHash("sha256").update(content).digest("hex");
	} catch (error) {
		if (error.code !== "ENOENT")
			console.warn(`Warning: Failed to hash ${filePath}: ${error.message}`);
		return null;
	}
}

async function getGitChangedFiles(packageDir) {
	try {
		const libDir = path.join(packageDir, "lib");
		const relativePath = path.relative(process.cwd(), libDir);

		// Check if there are any unstaged changes in the lib directory
		const { stdout: statusOutput } = await execCommand("git", [
			"status",
			"--porcelain",
			relativePath
		], { cwd: process.cwd() });

		// Check if there are any staged changes in the lib directory
		const { stdout: diffOutput } = await execCommand("git", [
			"diff",
			"--cached",
			"--name-only",
			relativePath
		], { cwd: process.cwd() });

		// Check if there are differences between HEAD and working tree
		const { stdout: headDiffOutput } = await execCommand("git", [
			"diff",
			"HEAD",
			"--name-only",
			relativePath
		], { cwd: process.cwd() });

		const changedFiles = [
			...statusOutput.split('\n').filter(line => line.trim()),
			...diffOutput.split('\n').filter(line => line.trim()),
			...headDiffOutput.split('\n').filter(line => line.trim())
		];

		return changedFiles.length > 0;
	} catch (error) {
		// If git command fails, assume files have changed to be safe
		console.warn(`Warning: Git diff check failed for ${packageDir}: ${error.message}`);
		return true;
	}
}

async function getAllSourceFiles(packageDir) {
	const coreFiles = [
		path.join(packageDir, "package.json"),
		path.join(packageDir, "tsconfig.json"),
	];
	const sourceFiles = coreFiles.filter(fsStat.existsSync);
	const libDir = path.join(packageDir, "lib");
	if (fsStat.existsSync(libDir)) {
		sourceFiles.push(...(await scanDirRecursive(libDir, /\.(ts|tsx|js|jsx)$/)));
	}
	return sourceFiles;
}

async function isCacheValid(packageDir, cacheDir) {
	if (!BUILD_CONFIG.enableCache) return false;
	try {
		const cacheFile = path.join(cacheDir, "build-cache.json");
		if (!fsStat.existsSync(cacheFile)) return false;
		const cacheData = JSON.parse(await fs.readFile(cacheFile, "utf8"));
		if (!cacheData?.hashes || typeof cacheData.hashes !== "object")
			return false;

		// Check for git changes first - if files changed in git, invalidate cache
		const hasGitChanges = await getGitChangedFiles(packageDir);
		if (hasGitChanges) {
			return false;
		}

		const currentFiles = (await getAllSourceFiles(packageDir)).filter(
			fsStat.existsSync,
		);
		const cachedFiles = Object.keys(cacheData.hashes);
		if (cachedFiles.length !== currentFiles.length) return false;
		if (currentFiles.some((f) => !(f in cacheData.hashes))) return false;
		if (cachedFiles.some((f) => !fsStat.existsSync(f))) return false;
		const hashResults = await Promise.all(
			currentFiles.map(
				async (file) =>
					(await calculateFileHash(file)) === cacheData.hashes[file],
			),
		);
		return (hashResults.every(Boolean) && cacheData.metrics) || true;
	} catch {
		return false;
	}
}

async function cleanCache(cacheDir) {
	if (!BUILD_CONFIG.enableCache) return;
	try {
		if (fsStat.existsSync(cacheDir)) {
			await fs.rm(cacheDir, { recursive: true, force: true });
		}
		await ensureDir(cacheDir);
	} catch (error) {
		logger.warn("Failed to clean cache directory", {
			cacheDir,
			error: error.message,
		});
	}
}

async function updateCache(packageDir, cacheDir, metrics) {
	if (!BUILD_CONFIG.enableCache) return;
	try {
		await fs.mkdir(cacheDir, { recursive: true });
		const sourceFiles = await getAllSourceFiles(packageDir);
		const hashes = {};
		let processedCount = 0;
		for (const file of sourceFiles) {
			if (fsStat.existsSync(file)) {
				const hash = await calculateFileHash(file);
				if (hash) {
					hashes[file] = hash;
					processedCount++;
				}
			}
		}
		const cacheData = {
			timestamp: Date.now(),
			version: "2.0",
			packageDir: packageDir,
			fileCount: processedCount,
			totalFiles: sourceFiles.length,
			hashes,
			metrics,
		};
		const cacheFile = path.join(cacheDir, "build-cache.json");
		await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
	} catch (error) {
		console.warn("Failed to update cache", {
			packageDir,
			error: error.message,
		});
		cleanCache(cacheDir).catch((cleanError) => {
			console.warn("Failed to clean cache after update failure", {
				cacheDir,
				originalError: error.message,
				cleanError: cleanError.message,
			});
		});
	}
}

async function validateBuildArtifacts(packageDir, packageName) {
	const distDir = path.join(packageDir, "dist");

	// Base required files (always present)
	const baseFiles = [
		`${packageName}.browser.js`,
		"index.d.ts",
	];

	// Bundle variants that might exist
	const possibleBundleFiles = [
		`${packageName}.js`,
		`${packageName}.min.js`
	];

	// At least one bundle variant must exist
	let foundBundle = false;
	for (const bundleFile of possibleBundleFiles) {
		if (fsStat.existsSync(path.join(distDir, bundleFile))) {
			foundBundle = true;
			break;
		}
	}

	if (!foundBundle) {
		throw new Error(`No bundle artifacts found. Expected at least one of: ${possibleBundleFiles.join(', ')}`);
	}

	// Validate base files
	for (const file of baseFiles) {
		const filePath = path.join(distDir, file);
		if (!fsStat.existsSync(filePath)) {
			throw new Error(`Missing build artifact: ${file}`);
		}
		const stat = await fs.stat(filePath);
		if (stat.size === 0) {
			throw new Error(`Empty build artifact: ${file}`);
		}
	}

	// Validate existing bundle files
	for (const bundleFile of possibleBundleFiles) {
		const filePath = path.join(distDir, bundleFile);
		if (fsStat.existsSync(filePath)) {
			const stat = await fs.stat(filePath);
			if (stat.size === 0) {
				throw new Error(`Empty build artifact: ${bundleFile}`);
			}

			// Check for corresponding source map
			const mapFile = `${bundleFile}.map`;
			const mapPath = path.join(distDir, mapFile);
			if (fsStat.existsSync(mapPath)) {
				const mapStat = await fs.stat(mapPath);
				if (mapStat.size === 0) {
					throw new Error(`Empty source map: ${mapFile}`);
				}
			}
		}
	}
}

// getPackageInfo is now imported from utils/package-info.js

async function cleanBuildDir(distDir) {
	if (fsStat.existsSync(distDir)) {
		await fs.rm(distDir, { recursive: true, force: true });
	}
	await ensureDir(distDir);
}

async function buildBundle(packageInfo, projectRoot, bundleMode = 'dev') {
	const { name, dir, distDir, peerDeps } = packageInfo;
	const externals = peerDeps.flatMap((dep) => ["--external", dep]);

	// Define bundle variants - just 2 by default
	const bundleVariants = [
		{
			suffix: '',
			description: 'Regular bundle',
			args: ["--format=esm", "--target=browser"],
			terser: false
		},
		{
			suffix: '.min',
			description: 'Minified bundle',
			args: ["--format=esm", "--minify-syntax", "--minify-whitespace", "--sourcemap", "--target=browser"],
			terser: { mangle: true }
		}
	];

	// Use all variants by default, size mode uses only minified
	const variants = bundleMode === 'size' ? [bundleVariants[1]] : bundleVariants;

	const bundleMetrics = {};

	for (const variant of variants) {
		const bundlePath = path.join(distDir, `${name}${variant.suffix}.js`);
		const mapPath = path.join(distDir, `${name}${variant.suffix}.js.map`);

		// Create a temporary unique filename to avoid conflicts when building multiple variants
		const tempBundlePath = path.join(dir, "lib", `${name}${variant.suffix}.js`);
		const tempMapPath = path.join(dir, "lib", `${name}${variant.suffix}.js.map`);

		const buildArgs = [
			"build",
			path.join(dir, "lib/index.ts"),
			`--outfile=${tempBundlePath}`,
			...variant.args,
			...externals,
		];

		await execCommand("bun", buildArgs, { cwd: projectRoot });

		// Move files from lib to dist directory
		if (fsStat.existsSync(tempBundlePath)) {
			await fs.rename(tempBundlePath, bundlePath);
		}
		if (fsStat.existsSync(tempMapPath)) {
			await fs.rename(tempMapPath, mapPath);
		}

		// Apply terser optimization if specified
		if (variant.terser && fsStat.existsSync(bundlePath)) {
			try {
				const terserArgs = [
					bundlePath,
					"--output", bundlePath,
					"--compress", "inline=3,reduce_funcs=true,reduce_vars=true,passes=3,side_effects=false,unsafe=true",
				];

				if (variant.terser.mangle) {
					terserArgs.push("--mangle");
				} else {
					terserArgs.push("--no-mangle");
				}

				await execCommand("npx", ["terser", ...terserArgs], { cwd: projectRoot });
			} catch (terserError) {
				console.warn(`Warning: Terser optimization failed for ${name}${variant.suffix}: ${terserError.message}`);
			}
		}

		// Calculate metrics for this variant
		if (fsStat.existsSync(bundlePath)) {
			const fileContents = await fs.readFile(bundlePath);
			const stats = await fs.stat(bundlePath);
			const gzipSize = gzipSync(fileContents).length;

			bundleMetrics[variant.suffix || 'regular'] = {
				description: variant.description,
				bundleSize: Math.round((stats.size / 1024) * 100) / 100,
				gzipSize: Math.round((gzipSize / 1024) * 100) / 100,
				path: bundlePath
			};
		}
	}

	return bundleMetrics;
}

async function buildBrowserBundle(packageInfo, projectRoot, bundleMode = 'dev') {
	const { name, dir, distDir } = packageInfo;
	const browserBundlePath = path.join(distDir, `${name}.browser.js`);

	// Core package gets standalone bundle, others use window.hellajs.core
	const isCore = name === 'core';

	if (isCore) {
		// Core package: standalone bundle with global setup
		const browserEntryContent = `
import * as coreExports from './lib/index.js';

if (typeof window !== 'undefined') {
  window.hellajs = window.hellajs || {};
  window.hellajs.core = coreExports;
}

export * from './lib/index.js';
`;

		const tempEntryPath = path.join(dir, 'browser-entry.js');
		await fs.writeFile(tempEntryPath, browserEntryContent);

		try {
			const buildArgs = [
				"build",
				tempEntryPath,
				"--format=iife",
				`--outfile=${browserBundlePath}`,
				"--global-name=HellaJSPackage",
				"--minify-syntax",
				"--minify-whitespace",
				"--target=browser",
				"--bundle",
			];

			await execCommand("bun", buildArgs, { cwd: projectRoot });

			// Apply terser optimization
			if (fsStat.existsSync(browserBundlePath)) {
				try {
					const terserArgs = [
						browserBundlePath,
						"--output", browserBundlePath,
						"--compress", "inline=3,reduce_funcs=true,reduce_vars=true,passes=3,side_effects=false,unsafe=true",
						"--no-mangle",
					];
					await execCommand("npx", ["terser", ...terserArgs], { cwd: projectRoot });
				} catch (terserError) {
					console.warn(`Warning: Terser optimization failed for ${name} browser bundle: ${terserError.message}`);
				}
			}
		} finally {
			if (fsStat.existsSync(tempEntryPath)) {
				await fs.unlink(tempEntryPath);
			}
		}
	} else {
		// Non-core packages: create a browser bundle with the actual code
		try {
			// Determine the ESM bundle file based on bundle mode
			let esmBundlePath;
			if (bundleMode === 'size') {
				esmBundlePath = path.join(distDir, `${name}.min.js`);
			} else {
				// Default to regular version, fallback to minified
				esmBundlePath = path.join(distDir, `${name}.js`);
			}

			// Fallback to any available bundle if the preferred one doesn't exist
			if (!fsStat.existsSync(esmBundlePath)) {
				const fallbacks = [
					path.join(distDir, `${name}.js`),
					path.join(distDir, `${name}.min.js`)
				];
				esmBundlePath = fallbacks.find(path => fsStat.existsSync(path));
				if (!esmBundlePath) {
					throw new Error(`No ESM bundle found for browser bundle creation`);
				}
			}

			let esmContent = await fs.readFile(esmBundlePath, 'utf8');

			// Extract exports - handle both formats: export{mount,forEach} and export {mount, forEach}
			let exportedFunctions = [];
			const exportMatch = esmContent.match(/export\s*\{\s*([^}]+)\s*\}/);
			if (exportMatch) {
				exportedFunctions = exportMatch[1].split(',').map(exp => exp.trim());
			}

			// Remove the import and export statements but keep all the function code
			let processedContent = esmContent
				.replace(/import\s*\{[^}]+\}\s*from\s*[^;]+;?\s*/g, '') // Remove imports
				.replace(/export\s*\{[^}]+\};?\s*$/g, ''); // Remove exports at end

			// Create the browser wrapper with all the actual code
			const browserWrapper = `(function() {
// Core dependency check
if (typeof window === 'undefined' || !window.hellajs || !window.hellajs.core) {
  throw new Error('HellaJS Core is required. Please include @hellajs/core browser bundle first.');
}

// Get core functions from window.hellajs.core
const { signal, effect, computed, batch, untracked } = window.hellajs.core;

// All package code with core functions available
${processedContent}

// Set up global namespace - preserve this assignment!
if (typeof window !== 'undefined') {
  window.hellajs = window.hellajs || {};
  window.hellajs.${name} = { ${exportedFunctions.join(', ')} };
}
})();`;

			await fs.writeFile(browserBundlePath, browserWrapper);

			// Skip Terser optimization for now to avoid namespace assignment being removed
			// TODO: Configure Terser to preserve the window.hellajs assignment

		} catch (error) {
			console.error(`Failed to create browser bundle for ${name}: ${error.message}`);
		}
	}
}

async function buildDeclarations(packageInfo, projectRoot) {
	const { distDir, tsconfigPath } = packageInfo;
	const tscPath = path.join(projectRoot, "node_modules/typescript/bin/tsc");
	const tscArgs = [
		tscPath,
		"--project",
		tsconfigPath,
		"--emitDeclarationOnly",
		"--outDir",
		distDir,
	];
	await execCommand("node", tscArgs, { cwd: projectRoot });
}

async function calculateMetrics(packageInfo, bundleMetrics = {}) {
	const { name, distDir } = packageInfo;

	// If bundleMetrics is passed from buildBundle, use it
	if (Object.keys(bundleMetrics).length > 0) {
		const sizesPath = path.join(distDir, 'sizes.json');
		const sizeData = {
			packageName: name,
			variants: bundleMetrics,
			timestamp: new Date().toISOString(),
		};

		try {
			await fs.writeFile(sizesPath, JSON.stringify(sizeData, null, 2));
		} catch (error) {
			console.warn(`Warning: Failed to write size data for ${name}: ${error.message}`);
		}

		// Return in the correct format with variants wrapper
		return { variants: bundleMetrics };
	}

	// Legacy fallback for single bundle
	const bundlePath = path.join(distDir, `${name}.js`);
	const metrics = {
		bundleSize: 0,
		gzipSize: 0,
	};
	if (fsStat.existsSync(bundlePath)) {
		const fileContents = await fs.readFile(bundlePath);
		const stats = await fs.stat(bundlePath);
		const gzipSize = gzipSync(fileContents).length;
		metrics.bundleSize = Math.round((stats.size / 1024) * 100) / 100;
		metrics.gzipSize = Math.round((gzipSize / 1024) * 100) / 100;
	}
	return metrics;
}

async function buildPackage(packageName, projectRoot, retryCount = 0, bundleMode = 'dev', shouldClean = false) {
	try {
		const packageInfo = await getPackageInfo(packageName);
		const distDir = packageInfo.distDir;
		const distFile = path.join(distDir, `${packageName}.js`);
		const cacheValid = await isCacheValid(
			packageInfo.dir,
			packageInfo.cacheDir,
		);
		const distExists = fsStat.existsSync(distFile);

		// Clean if requested
		if (shouldClean) {
			await cleanBuildDir(distDir);
			await cleanCache(packageInfo.cacheDir);
		}

		if (cacheValid && distExists && !shouldClean) {
			return { success: true, cached: true, packageName, metrics: cacheValid };
		}

		if (!shouldClean && cacheValid && !distExists) {
			await cleanBuildDir(distDir);
		} else if (!cacheValid || shouldClean) {
			await cleanBuildDir(distDir);
		}

		let bundleMetrics = {};

		for (const step of BUILD_CONFIG.buildSteps) {
			switch (step) {
				case "bundle":
					bundleMetrics = await buildBundle(packageInfo, projectRoot, bundleMode);
					break;
				case "browser":
					await buildBrowserBundle(packageInfo, projectRoot, bundleMode === 'size');
					break;
				case "declarations":
					await buildDeclarations(packageInfo, projectRoot);
					break;
			}
		}

		await validateBuildArtifacts(packageInfo.dir, packageName);
		const metrics = await calculateMetrics(packageInfo, bundleMetrics);
		await updateCache(packageInfo.dir, packageInfo.cacheDir, metrics);

		return { success: true, cached: false, packageName, metrics };
	} catch (error) {
		if (retryCount < BUILD_CONFIG.maxRetries) {
			await new Promise((resolve) =>
				setTimeout(resolve, 1000 * 2 ** retryCount),
			);
			return buildPackage(packageName, projectRoot, retryCount + 1, bundleMode, shouldClean);
		}
		logger.error(`Build failed for ${packageName}: ${error.message}`);
		return { success: false, error: error.message, packageName };
	}
}

function canBuildPackage(packageName, completed) {
	const deps = DEPENDENCY_GRAPH[packageName] || [];
	return deps.length === 0 || deps.every((dep) => completed.has(dep));
}

function getReadyPackages(packages, completed, activeBuilds) {
	return packages.filter(
		(pkg) =>
			!completed.has(pkg) &&
			!activeBuilds.has(pkg) &&
			canBuildPackage(pkg, completed),
	);
}

async function buildPackagesParallel(packages, builder, projectRoot) {
	const activeBuilds = new Set();
	const completed = new Set();
	const results = [];
	let remainingPackages = [...packages];
	while (remainingPackages.length > 0) {
		const slots = BUILD_CONFIG.maxParallel - activeBuilds.size;
		if (slots <= 0) {
			await new Promise((r) => setTimeout(r, 100));
			continue;
		}
		const readyPackages = getReadyPackages(
			remainingPackages,
			completed,
			activeBuilds,
		);
		const packagesToStart = readyPackages.slice(0, slots);
		if (!packagesToStart.length) {
			await new Promise((r) => setTimeout(r, 100));
			continue;
		}
		const buildPromises = packagesToStart.map(async (packageName) => {
			activeBuilds.add(packageName);
			try {
				const result = await builder(packageName, projectRoot);
				results.push(result);
				completed.add(packageName);
				if (!result.success && packageName === "core") {
					throw new Error("Core build failed - stopping build process");
				}
			} catch (error) {
				results.push({ success: false, error: error.message, packageName });
				throw error;
			} finally {
				activeBuilds.delete(packageName);
				remainingPackages = remainingPackages.filter(
					(pkg) => pkg !== packageName,
				);
			}
		});
		await Promise.race(buildPromises);
	}
	while (activeBuilds.size > 0) {
		await new Promise((r) => setTimeout(r, 100));
	}
	return results;
}

function generateSummary(results) {
	const successful = results.filter((r) => r.success);
	const failed = results.filter((r) => !r.success);
	const cached = successful.filter((r) => r.cached);
	return {
		total: results.length,
		successful: successful.length,
		failed: failed.length,
		cached: cached.length,
		failedPackages: failed.map((f) => ({
			name: f.packageName,
			error: f.error,
		})),
	};
}

const args = process.argv.slice(2);
const packageName = args.find((arg) => !arg.startsWith("--"));
const buildAll = args.includes("--all") || !packageName; // Default to all if no package specified
const bundleMode = args.includes("--size-mode") ? 'size' : 'dev';
const shouldClean = args.includes("--clean");
const enableCache = !args.includes("--no-cache");
const maxParallel =
	parseInt(args.find((arg) => arg.startsWith("--parallel="))?.split("=")[1]) ||
	BUILD_CONFIG.maxParallel;
const customProjectRoot = args
	.find((arg) => arg.startsWith("--project-root="))
	?.split("=")[1];

BUILD_CONFIG.enableCache = enableCache;
BUILD_CONFIG.maxParallel = maxParallel;

async function main() {
	try {
		if (buildAll) {
			await buildAllPackages();
		} else {
			await buildSinglePackage();
			const result = globalThis._buildSummary;
			if (
				result.successful === 1 &&
				result.failed === 0 &&
				result.total === 1
			) {
				const metrics =
					result.failedPackages.length === 0 && result.metrics
						? result.metrics
						: null;
				const pkg = packageName;
				// Single package build completed
			}
		}
	} catch (error) {
		logger.error("Build system failed", { error: error.message });
		process.exit(1);
	}
}

async function buildAllPackages() {
	const resolvedProjectRoot = customProjectRoot || projectRoot;
	if (!fsStat.existsSync(packagesDir)) {
		throw new Error("Packages directory not found");
	}
	const availablePackages = (await fs.readdir(packagesDir)).filter((pkg) => {
		const pkgDir = path.join(packagesDir, pkg);
		return (
			fsStat.statSync(pkgDir).isDirectory() &&
			fsStat.existsSync(path.join(pkgDir, "package.json"))
		);
	});
	const packagesToBuild = BUILD_ORDER.filter((pkg) =>
		availablePackages.includes(pkg),
	);
	const remainingPackages = availablePackages.filter(
		(pkg) => !BUILD_ORDER.includes(pkg),
	);
	packagesToBuild.push(...remainingPackages);

	// Create a wrapper function that includes new parameters
	const buildWrapper = (packageName, projectRoot) => buildPackage(packageName, projectRoot, 0, bundleMode, shouldClean);
	const results = await buildPackagesParallel(
		packagesToBuild,
		buildWrapper,
		resolvedProjectRoot,
	);
	const summary = generateSummary(results);
	globalThis._buildSummary = summary;

	// Enhanced reporting with size information
	if (summary.successful > 0) {
		console.log("\nBuild Summary:");
		results.filter(r => r.success).forEach(result => {
			const metrics = result.metrics;
			console.log(`@hellajs/${result.packageName}`);
			if (metrics && typeof metrics === 'object' && Object.keys(metrics).length > 0) {
				// Handle new multi-variant metrics
				if (metrics.variants) {
					Object.entries(metrics.variants).forEach(([variant, data]) => {
						console.log(`   ${variant === 'regular' ? 'Regular' : 'Minified'}: ${data.bundleSize}KB (${data.gzipSize}KB gzipped)`);
					});
				} else if (metrics.bundleSize) {
					// Legacy single bundle metrics
					console.log(`   Bundle: ${metrics.bundleSize}KB (${metrics.gzipSize}KB gzipped)`);
				}
			}
		});
	}

	if (summary.failed > 0) {
		loggerFinal(false, summary.failedPackages);
		process.exit(1);
	} else {
		loggerFinal(true, []);
	}
}

async function buildSinglePackage() {
	if (!packageName) {
		logger.error("Package name is required for single package build");
		process.exit(1);
	}
	const resolvedProjectRoot = customProjectRoot || projectRoot;
	const result = await buildPackage(packageName, resolvedProjectRoot, 0, bundleMode, shouldClean);
	if (!result.success) {
		logger.error(`Build failed for package ${packageName}: ${result.error}`);
		process.exit(1);
	}

	// Enhanced reporting with size information for single package
	const metrics = result.metrics;
	console.log(`@hellajs/${packageName}`);
	if (metrics && typeof metrics === 'object' && Object.keys(metrics).length > 0) {
		// Handle new multi-variant metrics
		if (metrics.variants) {
			Object.entries(metrics.variants).forEach(([variant, data]) => {
				console.log(`   ${variant === 'regular' ? 'Regular' : 'Minified'}: ${data.bundleSize}KB (${data.gzipSize}KB gzipped)`);
			});
		} else if (metrics.bundleSize) {
			// Legacy single bundle metrics
			console.log(`   Bundle: ${metrics.bundleSize}KB (${metrics.gzipSize}KB gzipped)`);
		}
	}

	logger.success(`Successfully built ${packageName}`);

	globalThis._buildSummary = {
		total: 1,
		successful: result.success ? 1 : 0,
		failed: result.success ? 0 : 1,
		failedPackages: result.success
			? []
			: [{ name: packageName, error: result.error }],
	};
}

if (process.env.NODE_ENV !== "test") {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
