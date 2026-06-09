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

// Build configuration with parallelization, retry logic, and cache settings
const BUILD_CONFIG = {
	maxParallel: Math.min(os.cpus().length, 4), // Max concurrent package builds
	maxRetries: 2, // Number of retry attempts on build failure
	buildTimeout: 120000, // Max time per build in ms
	cacheDir: ".build-cache", // Cache directory name
	enableCache: true, // Cache build results based on file hashes
	buildSteps: ["bundle", "declarations"], // Build steps to execute
};

// Order to build packages (respects dependency graph)
const BUILD_ORDER = ["core", "css", "dom", "store", "router", "resource", "ui"];

// Dependency relationships between packages
const DEPENDENCY_GRAPH = {
	core: [],
	css: ["core"],
	dom: ["core"],
	store: ["core"],
	router: ["core"],
	resource: ["core"],
	ui: ["core", "css", "dom"],
};

// Build variants: regular (readable) and minified (optimized)
const VARIANTS = [
	{ suffix: '', terser: false }, // Regular bundle
	{ suffix: '.min', terser: { mangle: true } } // Minified with terser
];



// Log final build results
const loggerFinal = (success, failedPackages) => {
	if (success) {
		logger.success("All packages built successfully!");
	} else {
		logger.error("Some packages failed to build:", failedPackages);
	}
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// Calculate file size and gzipped size in KB
async function calculateFileMetrics(filePath) {
	const fileContents = await fs.readFile(filePath);
	const stats = await fs.stat(filePath);
	const gzipSize = gzipSync(fileContents).length;
	return {
		bundleSize: Math.round((stats.size / 1024) * 100) / 100,
		gzipSize: Math.round((gzipSize / 1024) * 100) / 100
	};
}

// Build JavaScript bundle with esbuild
async function buildWithEsbuild(inputPath, outputPath, externals, isMinified, projectRoot) {
	const buildArgs = [
		"esbuild",
		inputPath,
		"--bundle",
		`--outfile=${outputPath}`,
		"--format=esm",
		"--target=es2020",
		"--platform=browser",
		"--out-extension:.js=.js",
		...externals
	];

	// Add minification and sourcemaps for minified builds only
	if (isMinified) {
		buildArgs.push("--minify", "--sourcemap");
	}

	await execCommand("npx", buildArgs, { cwd: projectRoot });
}

// Apply additional optimization with terser (after esbuild)
async function applyTerser(filePath, shouldMangle) {
	const fileName = path.basename(filePath);
	const mapFileName = `${fileName}.map`;
	const inputMapPath = `${filePath}.map`;
	const outputMapPath = inputMapPath;

	// Build source map option with input map if it exists
	let sourceMapOption = `url='${mapFileName}',filename='${fileName}'`;
	if (fsStat.existsSync(inputMapPath)) {
		sourceMapOption = `content='${inputMapPath}',url='${mapFileName}',filename='${fileName}'`;
	}

	const terserArgs = [
		filePath,
		"-o", filePath,
		"--source-map", sourceMapOption,
		"--compress", "inline=3,reduce_funcs=true,reduce_vars=true,passes=3,side_effects=false,unsafe=true"
	];

	if (shouldMangle) {
		terserArgs.push("--mangle");
	}

	await execCommand("npx", ["terser", ...terserArgs], { cwd: projectRoot });

	// Fix absolute paths in source map
	if (fsStat.existsSync(outputMapPath)) {
		const sourceMap = JSON.parse(await fs.readFile(outputMapPath, 'utf8'));
		sourceMap.file = fileName;
		await fs.writeFile(outputMapPath, JSON.stringify(sourceMap));
	}
}

// Fix minified file imports to reference .min.js files
async function fixMinifiedImports(filePath) {
	let content = await fs.readFile(filePath, 'utf8');

	// Fix imports with quotes: from"./path" or from'./path'
	content = content.replace(/from\s*["'](\.\.?\/[^"']+)["']/g, (match, importPath) => {
		// Skip if already has extension
		if (importPath.endsWith('.js') || importPath.endsWith('.min.js') || importPath.endsWith('.json')) {
			return match;
		}
		// Add .min.js extension
		return match.replace(importPath, `${importPath}.min.js`);
	});

	// Fix imports without quotes but with extension: from"./path.js"
	content = content.replace(/from\s*["']([^"']*\.js)["']/g, (match, importPath) => {
		if (importPath.endsWith('.min.js')) return match;
		return match.replace(importPath, importPath.replace('.js', '.min.js'));
	});

	// Fix dynamic imports with quotes: import('...')
	content = content.replace(/import\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g, (match, importPath) => {
		if (importPath.endsWith('.js') || importPath.endsWith('.min.js') || importPath.endsWith('.json')) {
			return match;
		}
		return match.replace(importPath, `${importPath}.min.js`);
	});

	// Fix dynamic imports with .js extension
	content = content.replace(/import\s*\(\s*["']([^"']*\.js)["']\s*\)/g, (match, importPath) => {
		if (importPath.endsWith('.min.js')) return match;
		return match.replace(importPath, importPath.replace('.js', '.min.js'));
	});

	await fs.writeFile(filePath, content, 'utf8');
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

// Calculate SHA256 hash of file contents for cache validation
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


// Get all source files that affect build output
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

// Get git status for source files in package
async function getGitStatus(packageDir) {
	try {
		const result = await execCommand("git", ["status", "--porcelain", packageDir], {
			cwd: projectRoot
		});
		return result.stdout.trim();
	} catch {
		return null;
	}
}

// Check if cached build is still valid (no file changes and no git changes)
async function isCacheValid(packageDir, cacheDir) {
	if (!BUILD_CONFIG.enableCache) return false;
	try {
		const cacheFile = path.join(cacheDir, "build-cache.json");
		if (!fsStat.existsSync(cacheFile)) return false;

		const cacheData = JSON.parse(await fs.readFile(cacheFile, "utf8"));
		if (!cacheData?.hashes || typeof cacheData.hashes !== "object") return false;

		// Check git status matches cached state
		const currentGitStatus = await getGitStatus(packageDir);
		if (currentGitStatus !== cacheData.gitStatus) return false;

		const currentFiles = (await getAllSourceFiles(packageDir)).filter(fsStat.existsSync);
		const cachedFiles = Object.keys(cacheData.hashes);

		// Check file count and existence
		if (cachedFiles.length !== currentFiles.length) return false;
		if (currentFiles.some(f => !(f in cacheData.hashes))) return false;
		if (cachedFiles.some(f => !fsStat.existsSync(f))) return false;

		// Verify all file hashes match
		const hashResults = await Promise.all(
			currentFiles.map(async file => (await calculateFileHash(file)) === cacheData.hashes[file])
		);

		return hashResults.every(Boolean);
	} catch {
		return false;
	}
}

// Remove cache directory and recreate empty
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

// Save build cache with file hashes, git status, and metrics
async function updateCache(packageDir, cacheDir, metrics) {
	if (!BUILD_CONFIG.enableCache) return;
	try {
		await fs.mkdir(cacheDir, { recursive: true });
		const sourceFiles = await getAllSourceFiles(packageDir);
		const hashes = {};

		// Hash all source files
		for (const file of sourceFiles) {
			if (fsStat.existsSync(file)) {
				const hash = await calculateFileHash(file);
				if (hash) hashes[file] = hash;
			}
		}

		// Capture current git status
		const gitStatus = await getGitStatus(packageDir);

		const cacheData = {
			timestamp: Date.now(),
			version: "2.1",
			gitStatus,
			hashes,
			metrics
		};

		const cacheFile = path.join(cacheDir, "build-cache.json");
		await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
	} catch (error) {
		console.warn(`Failed to update cache: ${error.message}`);
		cleanCache(cacheDir).catch(cleanError =>
			console.warn(`Failed to clean cache: ${cleanError.message}`)
		);
	}
}

// ============================================================================
// BUILD VALIDATION
// ============================================================================

// Verify all expected build artifacts were generated correctly
async function validateBuildArtifacts(packageDir) {
	const distDir = path.join(packageDir, "dist");

	// TypeScript declarations must always exist
	const baseFiles = ["index.d.ts"];

	// At least one bundle variant must exist
	const possibleBundleFiles = ["bundle.js", "bundle.min.js"];

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

	// Validate base files exist and are not empty
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

	// Validate existing bundle files are not empty
	for (const bundleFile of possibleBundleFiles) {
		const filePath = path.join(distDir, bundleFile);
		if (fsStat.existsSync(filePath)) {
			const stat = await fs.stat(filePath);
			if (stat.size === 0) {
				throw new Error(`Empty build artifact: ${bundleFile}`);
			}

			// Check corresponding source map if it exists
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

// ============================================================================
// BUILD OPERATIONS
// ============================================================================

// Remove and recreate dist directory
async function cleanBuildDir(distDir) {
	if (fsStat.existsSync(distDir)) {
		await fs.rm(distDir, { recursive: true, force: true });
	}
	await ensureDir(distDir);
}

// Get all TypeScript source files from lib directory (excludes .d.ts files)
async function getAllSourceModules(packageDir) {
	const libDir = path.join(packageDir, "lib");
	if (!fsStat.existsSync(libDir)) return [];

	const files = await scanDirRecursive(libDir, /\.ts$/);
	return files.filter(file => !file.endsWith('.d.ts'));
}

// Build each source module individually (preserves directory structure)
async function buildIndividualModules(packageInfo, projectRoot) {
	const { dir, distDir } = packageInfo;
	const libDir = path.join(dir, "lib");
	const sourceModules = await getAllSourceModules(dir);
	const bundleMetrics = { modules: {} };

	for (const modulePath of sourceModules) {
		const relativePath = path.relative(libDir, modulePath);
		const moduleName = relativePath.replace(/\.ts$/, '').replace(/\\/g, '/');
		const moduleDir = path.dirname(relativePath);
		const baseName = path.basename(relativePath, '.ts');
		const outputDir = moduleDir === '.' ? distDir : path.join(distDir, moduleDir);

		await ensureDir(outputDir);

		const moduleMetrics = {};

		// Build both regular and minified variants
		for (const variant of VARIANTS) {
			const outputPath = path.join(outputDir, `${baseName}${variant.suffix}.js`);
			const isMinified = variant.suffix === '.min';

			// Transpile TypeScript without bundling (preserves imports)
			const buildArgs = [
				"esbuild",
				modulePath,
				`--outfile=${outputPath}`,
				"--format=esm",
				"--target=es2020",
				"--platform=browser"
			];

			if (isMinified) {
				buildArgs.push("--minify", "--sourcemap");
			}

			await execCommand("npx", buildArgs, { cwd: projectRoot });

			// Fix imports: esbuild doesn't add .js extensions, need to add them properly
			if (fsStat.existsSync(outputPath)) {
				let content = await fs.readFile(outputPath, 'utf8');

				// Add .js extensions to relative imports, using /index.js for directories
				content = content.replace(/from\s+["'](\.\.?\/[^"']+)["']/g, (match, importPath) => {
					// Skip if already has extension
					if (importPath.endsWith('.js') || importPath.endsWith('.json')) return match;

					// Check source to see if this path is a directory
					const sourceDir = path.dirname(modulePath);
					const sourcePath = path.resolve(sourceDir, importPath);
					const sourceIndexPath = path.join(sourcePath, 'index.ts');

					// If source has index.ts in a directory, use /index.js
					if (fsStat.existsSync(sourceIndexPath)) {
						return match.replace(importPath, `${importPath}/index.js`);
					}
					// Otherwise add .js to the file
					return match.replace(importPath, `${importPath}.js`);
				});

				// Fix dynamic imports similarly
				content = content.replace(/import\s*\(\s*["'](\.\.?\/[^"']+)["']\s*\)/g, (match, importPath) => {
					if (importPath.endsWith('.js') || importPath.endsWith('.json')) return match;

					const sourceDir = path.dirname(modulePath);
					const sourcePath = path.resolve(sourceDir, importPath);
					const sourceIndexPath = path.join(sourcePath, 'index.ts');

					if (fsStat.existsSync(sourceIndexPath)) {
						return match.replace(importPath, `${importPath}/index.js`);
					}
					return match.replace(importPath, `${importPath}.js`);
				});

				// For minified files, convert .js imports to .min.js
				if (isMinified) {
					content = content.replace(/from\s+["']([^"']*\.js)["']/g, (match, importPath) => {
						if (importPath.endsWith('.min.js')) return match;
						return match.replace(importPath, importPath.replace('.js', '.min.js'));
					});
					content = content.replace(/import\s*\(\s*["']([^"']*\.js)["']\s*\)/g, (match, importPath) => {
						if (importPath.endsWith('.min.js')) return match;
						return match.replace(importPath, importPath.replace('.js', '.min.js'));
					});
				}

				await fs.writeFile(outputPath, content, 'utf8');
			}

			// Apply additional terser optimization for minified builds
			if (variant.terser && fsStat.existsSync(outputPath)) {
				try {
					await applyTerser(outputPath, variant.terser.mangle, distDir);
					// Fix minified imports to use .min.js after terser
					await fixMinifiedImports(outputPath);
				} catch (terserError) {
					console.warn(`Warning: Terser optimization failed for ${moduleName}${variant.suffix}: ${terserError.message}`);
				}
			}

			// Collect size metrics
			if (fsStat.existsSync(outputPath)) {
				moduleMetrics[variant.suffix || 'regular'] = await calculateFileMetrics(outputPath);
			}
		}

		bundleMetrics.modules[moduleName] = moduleMetrics;
	}

	return bundleMetrics;
}

// Build main package bundle from index.ts entry point
async function buildBundle(packageInfo, projectRoot, bundleMode = 'dev') {
	const { dir, distDir, peerDeps } = packageInfo;
	const externals = peerDeps.flatMap((dep) => [`--external:${dep}`]);
	const variants = bundleMode === 'size' ? [VARIANTS[1]] : VARIANTS; // Size mode = minified only
	const bundleMetrics = {};

	for (const variant of variants) {
		const bundlePath = path.join(distDir, `bundle${variant.suffix}.js`);
		const isMinified = variant.suffix === '.min';

		await buildWithEsbuild(path.join(dir, "lib/index.ts"), bundlePath, externals, isMinified, projectRoot);

		// Fix imports after build
		if (fsStat.existsSync(bundlePath)) {
			let content = await fs.readFile(bundlePath, 'utf8');

			// For minified files, convert .js imports to .min.js
			if (isMinified) {
				content = content.replace(/from\s+["']([^"']*\.js)["']/g, (match, importPath) => {
					if (importPath.endsWith('.min.js')) return match;
					return match.replace(importPath, importPath.replace('.js', '.min.js'));
				});
				content = content.replace(/import\s*\(\s*["']([^"']*\.js)["']\s*\)/g, (match, importPath) => {
					if (importPath.endsWith('.min.js')) return match;
					return match.replace(importPath, importPath.replace('.js', '.min.js'));
				});
			}

			await fs.writeFile(bundlePath, content, 'utf8');
		}

		// Apply terser optimization for minified builds
		if (variant.terser && fsStat.existsSync(bundlePath)) {
			try {
				await applyTerser(bundlePath, variant.terser.mangle, projectRoot);
				// Fix minified imports to use .min.js after terser
				await fixMinifiedImports(bundlePath);
			} catch (terserError) {
				console.warn(`Warning: Terser optimization failed for bundle${variant.suffix}: ${terserError.message}`);
			}
		}

		// Collect size metrics
		if (fsStat.existsSync(bundlePath)) {
			const metrics = await calculateFileMetrics(bundlePath);
			bundleMetrics[variant.suffix || 'regular'] = {
				...metrics,
				path: bundlePath
			};
		}
	}

	return bundleMetrics;
}

// Generate TypeScript declaration files (.d.ts)
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

// Copy existing .d.ts files from lib to dist (preserves directory structure)
async function copyDeclarationFiles(packageInfo) {
	const { dir, distDir } = packageInfo;
	const libDir = path.join(dir, "lib");

	if (!fsStat.existsSync(libDir)) return;

	const dtsFiles = await scanDirRecursive(libDir, /\.d\.ts$/);

	for (const dtsFile of dtsFiles) {
		const relativePath = path.relative(libDir, dtsFile);
		const destPath = path.join(distDir, relativePath);
		const destDir = path.dirname(destPath);

		await ensureDir(destDir);
		await fs.copyFile(dtsFile, destPath);
	}
}

// Calculate and save bundle metrics to sizes.json
async function calculateMetrics(packageInfo, bundleMetrics = {}) {
	const { name, distDir } = packageInfo;

	if (Object.keys(bundleMetrics).length === 0) return {};

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

	return bundleMetrics;
}

// ============================================================================
// PACKAGE BUILD ORCHESTRATION
// ============================================================================

// Build a single package with retry logic and caching
async function buildPackage(packageName, projectRoot, retryCount = 0, bundleMode = 'dev', shouldClean = false) {
	try {
		const packageInfo = await getPackageInfo(packageName);
		const { distDir, dir, cacheDir } = packageInfo;
		const distFile = path.join(distDir, "bundle.js");

		// Clean if explicitly requested
		if (shouldClean) {
			await cleanBuildDir(distDir);
			await cleanCache(cacheDir);
		}

		// Check if we can use cached build
		const cacheValid = await isCacheValid(dir, cacheDir);
		const distExists = fsStat.existsSync(distFile);

		if (cacheValid && distExists) {
			return { success: true, cached: true, packageName, metrics: cacheValid };
		}

		// Clean before fresh build
		await cleanBuildDir(distDir);

		// Build main bundle and individual modules
		const bundleMetrics = await buildBundle(packageInfo, projectRoot, bundleMode);
		const moduleMetrics = await buildIndividualModules(packageInfo, projectRoot, bundleMode);
		const allMetrics = { ...bundleMetrics, ...moduleMetrics };

		// Generate TypeScript declarations
		await buildDeclarations(packageInfo, projectRoot);

		// Copy existing .d.ts files from source
		await copyDeclarationFiles(packageInfo);

		// Validate all artifacts were created
		await validateBuildArtifacts(dir, packageName);

		// Save metrics and update cache
		const metrics = await calculateMetrics(packageInfo, allMetrics);
		await updateCache(dir, cacheDir, metrics);

		return { success: true, cached: false, packageName, metrics };
	} catch (error) {
		// Retry with exponential backoff
		if (retryCount < BUILD_CONFIG.maxRetries) {
			await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** retryCount));
			return buildPackage(packageName, projectRoot, retryCount + 1, bundleMode, shouldClean);
		}
		logger.error(`Build failed for ${packageName}: ${error.message}`);
		return { success: false, error: error.message, packageName };
	}
}

// Check if package dependencies are all built
function canBuildPackage(packageName, completed) {
	const deps = DEPENDENCY_GRAPH[packageName] || [];
	return deps.every(dep => completed.has(dep));
}

// Get packages that are ready to build (dependencies met, not in progress)
function getReadyPackages(packages, completed, activeBuilds) {
	return packages.filter(pkg =>
		!completed.has(pkg) &&
		!activeBuilds.has(pkg) &&
		canBuildPackage(pkg, completed)
	);
}

// Build multiple packages in parallel respecting dependency order
async function buildPackagesParallel(packages, builder, projectRoot) {
	const activeBuilds = new Set();
	const completed = new Set();
	const results = [];
	let remainingPackages = [...packages];

	while (remainingPackages.length > 0) {
		const slots = BUILD_CONFIG.maxParallel - activeBuilds.size;

		// Wait for available slots
		if (slots <= 0) {
			await new Promise(r => setTimeout(r, 100));
			continue;
		}

		// Get packages whose dependencies are met
		const readyPackages = getReadyPackages(remainingPackages, completed, activeBuilds);
		const packagesToStart = readyPackages.slice(0, slots);

		// Wait if no packages are ready yet
		if (!packagesToStart.length) {
			await new Promise(r => setTimeout(r, 100));
			continue;
		}

		// Start building ready packages
		const buildPromises = packagesToStart.map(async packageName => {
			activeBuilds.add(packageName);
			try {
				const result = await builder(packageName, projectRoot);
				results.push(result);
				completed.add(packageName);
				// Stop all builds if core fails (everything depends on it)
				if (!result.success && packageName === "core") {
					throw new Error("Core build failed - stopping build process");
				}
			} catch (error) {
				results.push({ success: false, error: error.message, packageName });
				throw error;
			} finally {
				activeBuilds.delete(packageName);
				remainingPackages = remainingPackages.filter(pkg => pkg !== packageName);
			}
		});

		// Wait for at least one to complete
		await Promise.race(buildPromises);
	}

	// Wait for all remaining builds to complete
	while (activeBuilds.size > 0) {
		await new Promise(r => setTimeout(r, 100));
	}

	return results;
}

// Generate summary statistics from build results
function generateSummary(results) {
	const successful = results.filter(r => r.success);
	const failed = results.filter(r => !r.success);
	const cached = successful.filter(r => r.cached);

	return {
		total: results.length,
		successful: successful.length,
		failed: failed.length,
		cached: cached.length,
		failedPackages: failed.map(f => ({ name: f.packageName, error: f.error }))
	};
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

const args = process.argv.slice(2);
const packageName = args.find((arg) => !arg.startsWith("--")); // First non-flag arg
const buildAll = !packageName; // Build all if no package specified
const bundleMode = args.includes("--size-mode") ? 'size' : 'dev'; // Size mode = minified only
const shouldClean = args.includes("--clean"); // Force clean build
const enableCache = !args.includes("--no-cache"); // Cache enabled by default
const maxParallel =
	parseInt(args.find((arg) => arg.startsWith("--parallel="))?.split("=")[1]) ||
	BUILD_CONFIG.maxParallel;
const customProjectRoot = args
	.find((arg) => arg.startsWith("--project-root="))
	?.split("=")[1];

// Apply CLI overrides to build config
BUILD_CONFIG.enableCache = enableCache;
BUILD_CONFIG.maxParallel = maxParallel;

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

async function main() {
	try {
		buildAll ? await buildAllPackages() : await buildSinglePackage();
	} catch (error) {
		logger.error("Build system failed", { error: error.message });
		process.exit(1);
	}
}

// Build all packages in the monorepo
async function buildAllPackages() {
	const resolvedProjectRoot = customProjectRoot || projectRoot;
	if (!fsStat.existsSync(packagesDir)) {
		throw new Error("Packages directory not found");
	}

	// Discover all valid packages (dirs with package.json)
	const availablePackages = (await fs.readdir(packagesDir)).filter(pkg => {
		const pkgDir = path.join(packagesDir, pkg);
		return fsStat.statSync(pkgDir).isDirectory() &&
			fsStat.existsSync(path.join(pkgDir, "package.json"));
	});

	// Build in dependency order, then remaining packages
	const packagesToBuild = [
		...BUILD_ORDER.filter(pkg => availablePackages.includes(pkg)),
		...availablePackages.filter(pkg => !BUILD_ORDER.includes(pkg))
	];

	const buildWrapper = (packageName, projectRoot) =>
		buildPackage(packageName, projectRoot, 0, bundleMode, shouldClean);

	const results = await buildPackagesParallel(packagesToBuild, buildWrapper, resolvedProjectRoot);
	const summary = generateSummary(results);
	globalThis._buildSummary = summary;

	// Display build summary with minified metrics only
	if (summary.successful > 0) {
		console.log("\nBuild Summary:");
		results.filter(r => r.success).forEach(result => {
			const metrics = result.metrics;
			console.log(`@hellajs/${result.packageName}`);
			if (metrics && typeof metrics === 'object' && Object.keys(metrics).length > 0) {
				const minified = metrics['.min'] || metrics.min;
				if (minified) {
					console.log(`   ${minified.bundleSize}KB (${minified.gzipSize}KB gzipped)`);
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

// Build a single specified package
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

	// Display build metrics (minified only)
	const metrics = result.metrics;
	console.log(`\n@hellajs/${packageName}`);
	if (metrics && typeof metrics === 'object' && Object.keys(metrics).length > 0) {
		const minified = metrics['.min'] || metrics.min;
		if (minified) {
			console.log(`   ${minified.bundleSize}KB (${minified.gzipSize}KB gzipped)`);
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

// Run build system (skip if running tests)
if (process.env.NODE_ENV !== "test") {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}
