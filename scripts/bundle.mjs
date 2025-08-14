import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import fsStat from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

/**
 * Production-ready build system for HellaJS monorepo
 * 
 * Features:
 * - Dependency-aware parallel builds
 * - Build caching and incremental builds
 * - Comprehensive error handling with retry logic
 * - Structured logging with performance metrics
 * - Resource monitoring and cleanup
 * - Build artifact validation
 * - Progress indicators
 * 
 * @author HellaJS DevOps Team
 */

// ===== CONFIGURATION =====

/**
 * Build configuration with sensible defaults
 * @typedef {Object} BuildConfig
 */
const BUILD_CONFIG = {
	/** Maximum number of parallel builds */
	maxParallel: Math.min(os.cpus().length, 4),
	/** Maximum build retries on failure */
	maxRetries: 2,
	/** Build timeout in milliseconds */
	buildTimeout: 120000, // 2 minutes
	/** Cache directory for build artifacts */
	cacheDir: ".build-cache",
	/** Enable incremental builds */
	enableCache: true,
	/** Progress update interval in milliseconds */
	progressInterval: 1000,
	/** Log levels: 'error', 'warn', 'info', 'debug' */
	logLevel: "info",
	/** Build steps to execute */
	buildSteps: ["bundle", "declarations"],
};

/**
 * Package dependency order (core must be first)
 * Packages not in this list will be built in parallel after dependencies
 */
const BUILD_ORDER = ["core", "css", "dom", "store", "router", "resource"];

/**
 * Build dependency graph - maps package to its dependencies
 */
const DEPENDENCY_GRAPH = {
	core: [],
	css: ["core"],
	dom: ["core"],
	store: ["core"],
	router: ["core"],
	resource: ["core"],
};

// ===== LOGGING SYSTEM =====

/**
 * Structured logger with multiple levels and performance tracking
 */
class Logger {
	constructor(level = "info", quiet = false) {
		this.levels = { error: 0, warn: 1, info: 2, debug: 3 };
		this.level = this.levels[level] || 2;
		this.quiet = quiet;
		this.startTime = performance.now();
	}

	/**
	 * Format log message with timestamp and context
	 */
	formatMessage(level, message, context = {}) {
		const timestamp = new Date().toISOString();
		const elapsed = ((performance.now() - this.startTime) / 1000).toFixed(2);
		const prefix = `[${timestamp}] [${elapsed}s] [${level.toUpperCase()}]`;

		if (Object.keys(context).length > 0) {
			return `${prefix} ${message} ${JSON.stringify(context)}`;
		}
		return `${prefix} ${message}`;
	}

	error(message, context) {
		if (this.levels.error <= this.level) {
			console.error(this.formatMessage("error", message, context));
		}
	}

	warn(message, context) {
		if (this.levels.warn <= this.level) {
			console.warn(this.formatMessage("warn", message, context));
		}
	}

	info(message, context) {
		if (this.levels.info <= this.level && !this.quiet) {
			console.log(this.formatMessage("info", message, context));
		}
	}

	debug(message, context) {
		if (this.levels.debug <= this.level && !this.quiet) {
			console.log(this.formatMessage("debug", message, context));
		}
	}

	/**
	 * Log build metrics and performance data
	 */
	metrics(packageName, metrics) {
		this.info(`Build metrics for ${packageName}`, {
			duration: `${metrics.duration}ms`,
			bundleSize: `${metrics.bundleSize}KB`,
			gzipSize: `${metrics.gzipSize}KB`,
			memoryUsed: `${metrics.memoryUsed}MB`,
		});
	}
}

// ===== UTILITY FUNCTIONS =====

/**
 * Promisified spawn with timeout and proper error handling
 */
function execCommand(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const { timeout = BUILD_CONFIG.buildTimeout, ...spawnOptions } = options;

		const child = spawn(command, args, {
			stdio: ["pipe", "pipe", "pipe"],
			...spawnOptions,
		});

		let stdout = "";
		let stderr = "";
		let timer;

		if (timeout) {
			timer = setTimeout(() => {
				child.kill("SIGKILL");
				reject(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(" ")}`));
			}, timeout);
		}

		child.stdout?.on("data", (data) => {
			stdout += data;
		});

		child.stderr?.on("data", (data) => {
			stderr += data;
		});

		child.on("close", (code) => {
			if (timer) clearTimeout(timer);

			if (code === 0) {
				resolve({ stdout, stderr, code });
			} else {
				reject(new Error(`Command failed with code ${code}: ${command} ${args.join(" ")}\nStderr: ${stderr}`));
			}
		});

		child.on("error", (error) => {
			if (timer) clearTimeout(timer);
			reject(error);
		});
	});
}

/**
 * Calculate file hash for cache invalidation
 */
async function calculateFileHash(filePath) {
	try {
		const content = await fs.readFile(filePath);
		return createHash("sha256").update(content).digest("hex");
	} catch (error) {
		// Return null for missing files, but log other errors
		if (error.code !== 'ENOENT') {
			if (typeof logger !== 'undefined' && logger.warn) {
				logger.warn(`Failed to hash file: ${filePath}`, { error: error.message });
			} else {
				console.warn(`Warning: Failed to hash ${filePath}: ${error.message}`);
			}
		}
		return null;
	}
}

/**
 * Recursively get all source files in a directory
 */
async function getAllSourceFiles(packageDir) {
	const sourceFiles = [];

	// Always include these core files
	const coreFiles = [
		path.join(packageDir, "package.json"),
		path.join(packageDir, "tsconfig.json"),
	];

	for (const file of coreFiles) {
		if (fsStat.existsSync(file)) {
			sourceFiles.push(file);
		}
	}

	// Recursively scan lib directory for source files
	const libDir = path.join(packageDir, "lib");
	if (fsStat.existsSync(libDir)) {
		const libFiles = await scanDirectoryRecursive(libDir, /\.(ts|tsx|js|jsx)$/);
		sourceFiles.push(...libFiles);
	}

	return sourceFiles;
}

/**
 * Recursively scan directory for files matching pattern
 */
async function scanDirectoryRecursive(dir, pattern) {
	const files = [];

	try {
		const entries = await fs.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			if (entry.isDirectory()) {
				// Recursively scan subdirectories
				const subFiles = await scanDirectoryRecursive(fullPath, pattern);
				files.push(...subFiles);
			} else if (entry.isFile() && pattern.test(entry.name)) {
				files.push(fullPath);
			}
		}
	} catch (error) {
		if (typeof logger !== 'undefined' && logger.warn) {
			logger.warn(`Failed to scan directory: ${dir}`, { error: error.message });
		} else {
			console.warn(`Warning: Failed to scan directory ${dir}: ${error.message}`);
		}
	}

	return files;
}

/**
 * Check if build cache is valid
 */
async function isCacheValid(packageDir, cacheDir) {
	if (!BUILD_CONFIG.enableCache) return false;

	try {
		const cacheFile = path.join(cacheDir, "build-cache.json");

		// Check if cache file exists and is readable
		if (!fsStat.existsSync(cacheFile)) {
			return false;
		}

		const cacheData = JSON.parse(await fs.readFile(cacheFile, "utf8"));

		// Validate cache file structure
		if (!cacheData || !cacheData.hashes || typeof cacheData.hashes !== 'object') {
			if (typeof logger !== 'undefined' && logger.warn) {
				logger.warn('Invalid cache file format', { cacheFile, hasHashes: !!cacheData?.hashes });
			} else {
				console.warn(`Warning: Invalid cache file format: ${cacheFile}`);
			}
			return false;
		}

		// Get all current source files
		const currentSourceFiles = await getAllSourceFiles(packageDir);

		// Get all current source files that exist
		const currentFiles = [];
		const fileExistenceMap = new Map();

		for (const file of currentSourceFiles) {
			const exists = fsStat.existsSync(file);
			fileExistenceMap.set(file, exists);
			if (exists) {
				currentFiles.push(file);
			}
		}

		const cachedFiles = Object.keys(cacheData.hashes);

		// Quick check: if file count changed, cache is invalid
		if (cachedFiles.length !== currentFiles.length) {
			return false;
		}

		// Check if any files were added or removed
		for (const file of currentFiles) {
			if (!(file in cacheData.hashes)) {
				return false; // New file added
			}
		}

		// Check for removed files
		for (const cachedFile of cachedFiles) {
			if (!fileExistenceMap.has(cachedFile) || !fileExistenceMap.get(cachedFile)) {
				return false; // File was removed
			}
		}

		// Check if any existing files have changed (parallel processing for better performance)
		const hashPromises = currentFiles.map(async (file) => {
			const currentHash = await calculateFileHash(file);
			const cachedHash = cacheData.hashes[file];
			return { file, valid: currentHash === cachedHash };
		});

		const hashResults = await Promise.all(hashPromises);

		// If any file has changed, cache is invalid
		for (const result of hashResults) {
			if (!result.valid) {
				return false;
			}
		}

		return true;
	} catch (error) {
		const log = globalThis.logger || { warn: console.warn };
		log.warn('Cache validation failed', { error: error.message, cacheDir });
		return false;
	}
}

/**
 * Clean invalid or corrupted cache files
 */
async function cleanCache(cacheDir) {
	if (!BUILD_CONFIG.enableCache) return;

	try {
		if (fsStat.existsSync(cacheDir)) {
			await fs.rm(cacheDir, { recursive: true, force: true });
		}
		await fs.mkdir(cacheDir, { recursive: true });
	} catch (error) {
		const log = globalThis.logger || { warn: console.warn };
		log.warn('Failed to clean cache directory', { cacheDir, error: error.message });
		// Don't throw - allow system to continue without cache
	}
}

/**
 * Update build cache
 */
async function updateCache(packageDir, cacheDir) {
	if (!BUILD_CONFIG.enableCache) return;

	try {
		await fs.mkdir(cacheDir, { recursive: true });

		// Get all source files dynamically
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
			version: "2.0", // Cache format version
			packageDir: packageDir,
			fileCount: processedCount,
			totalFiles: sourceFiles.length,
			hashes,
		};

		const cacheFile = path.join(cacheDir, "build-cache.json");
		await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));

		const log = globalThis.logger || { debug: () => { } };
		log.debug('Cache updated successfully', {
			packageDir: path.basename(packageDir),
			filesHashed: processedCount,
			totalFiles: sourceFiles.length
		});

	} catch (error) {
		const log = globalThis.logger || { warn: console.warn };
		log.warn('Failed to update cache', { packageDir, error: error.message });

		// Clean corrupted cache on write failure, but don't await to avoid cascading errors
		cleanCache(cacheDir).catch(cleanError => {
			const cleanLog = globalThis.logger || { warn: console.warn };
			cleanLog.warn('Failed to clean cache after update failure', {
				cacheDir,
				originalError: error.message,
				cleanError: cleanError.message
			});
		});
	}
}

/**
 * Validate build artifacts
 */
async function validateBuildArtifacts(packageDir, packageName) {
	const distDir = path.join(packageDir, "dist");
	const expectedFiles = [
		`${packageName}.js`,
		`${packageName}.js.map`,
		"index.d.ts",
	];

	for (const file of expectedFiles) {
		const filePath = path.join(distDir, file);
		if (!fsStat.existsSync(filePath)) {
			throw new Error(`Missing build artifact: ${file}`);
		}

		const stat = await fs.stat(filePath);
		if (stat.size === 0) {
			throw new Error(`Empty build artifact: ${file}`);
		}
	}
}

/**
 * Get memory usage in MB
 */
function getMemoryUsage() {
	const usage = process.memoryUsage();
	return Math.round(usage.heapUsed / 1024 / 1024);
}

// ===== PACKAGE BUILDER CLASS =====

/**
 * Enhanced package builder with caching, validation, and monitoring
 */
class PackageBuilder {
	constructor(logger, projectRoot = null) {
		this.logger = logger;
		this.projectRoot = projectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	}

	/**
	 * Get package metadata and validate structure
	 */
	async getPackageInfo(packageName) {
		const packageDir = path.join(this.projectRoot, "packages", packageName);
		const packageJsonPath = path.join(packageDir, "package.json");
		const entryPoint = path.join(packageDir, "lib/index.ts");
		const tsconfigPath = path.join(packageDir, "tsconfig.json");

		// Validate package structure
		const validations = [
			{ path: packageDir, name: "package directory" },
			{ path: packageJsonPath, name: "package.json" },
			{ path: entryPoint, name: "entry point" },
			{ path: tsconfigPath, name: "tsconfig.json" },
		];

		for (const { path: filePath, name } of validations) {
			if (!fsStat.existsSync(filePath)) {
				throw new Error(`${name} not found: ${filePath}`);
			}
		}

		// Read package.json
		const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
		const peerDeps = Object.keys(packageJson.peerDependencies || {});

		return {
			name: packageName,
			dir: packageDir,
			entryPoint,
			tsconfigPath,
			distDir: path.join(packageDir, "dist"),
			cacheDir: path.join(packageDir, BUILD_CONFIG.cacheDir),
			peerDeps,
			packageJson,
		};
	}

	/**
	 * Clean build directory with error handling
	 */
	async cleanBuildDir(distDir) {
		try {
			if (fsStat.existsSync(distDir)) {
				await fs.rm(distDir, { recursive: true, force: true });
			}
			await fs.mkdir(distDir, { recursive: true });
		} catch (error) {
			throw new Error(`Failed to clean build directory: ${error.message}`);
		}
	}

	/**
	 * Build ESM bundle with optimized settings
	 */
	async buildBundle(packageInfo) {
		const { name, dir, distDir, peerDeps } = packageInfo;
		const bundlePath = path.join(distDir, `${name}.js`);

		// Prepare external dependencies
		const externals = peerDeps.flatMap(dep => ["--external", dep]);

		const buildArgs = [
			"build",
			path.join(dir, "lib/index.ts"),
			"--format=esm",
			`--outfile=${path.join(distDir, `${name}.js`)}`,
			"--minify-syntax",
			"--minify-whitespace",
			"--sourcemap",
			"--target=browser",
			...externals,
		];

		this.logger.debug(`Building ESM bundle for ${name}`, { args: buildArgs });

		try {
			// Run from the project root so that dependencies are available
			await execCommand("bun", buildArgs, { cwd: this.projectRoot });

			// Handle file relocation from lib to dist if needed
			const libBundle = path.join(dir, "lib", `${name}.js`);
			const libSourceMap = path.join(dir, "lib", `${name}.js.map`);

			if (fsStat.existsSync(libBundle)) {
				await fs.rename(libBundle, bundlePath);
			}

			if (fsStat.existsSync(libSourceMap)) {
				await fs.rename(libSourceMap, path.join(distDir, `${name}.js.map`));
			}

		} catch (error) {
			throw new Error(`Bundle build failed: ${error.message}`);
		}
	}

	/**
	 * Generate TypeScript declarations
	 */
	async buildDeclarations(packageInfo) {
		const { name, dir, distDir, tsconfigPath } = packageInfo;

		// Find the TypeScript compiler from the main project
		const tscPath = path.join(this.projectRoot, "node_modules/typescript/bin/tsc");
		
		const tscArgs = [
			tscPath,
			"--project",
			tsconfigPath,
			"--emitDeclarationOnly",
			"--outDir",
			distDir,
		];

		this.logger.debug(`Building declarations for ${name}`, { args: tscArgs });

		try {
			// Run TypeScript compiler directly  
			await execCommand("node", tscArgs, { cwd: this.projectRoot });
		} catch (error) {
			throw new Error(`Declaration build failed: ${error.message}`);
		}
	}

	/**
	 * Calculate and report build metrics
	 */
	async calculateMetrics(packageInfo, startTime) {
		const { name, distDir } = packageInfo;
		const bundlePath = path.join(distDir, `${name}.js`);

		const metrics = {
			duration: Math.round(performance.now() - startTime),
			bundleSize: 0,
			gzipSize: 0,
			memoryUsed: getMemoryUsage(),
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

	/**
	 * Build single package with full error handling and monitoring
	 */
	async buildPackage(packageName, retryCount = 0) {
		const buildStart = performance.now();

		try {
			this.logger.info(`Building package: @hellajs/${packageName}`);

			// Get package information and validate structure
			const packageInfo = await this.getPackageInfo(packageName);

			// Check build cache
			if (await isCacheValid(packageInfo.dir, packageInfo.cacheDir)) {
				this.logger.info(`Using cached build for ${packageName}`);
				return { success: true, cached: true, packageName };
			}

			// Log peer dependencies
			if (packageInfo.peerDeps.length > 0) {
				this.logger.debug(`External peer dependencies for ${packageName}`, {
					deps: packageInfo.peerDeps,
				});
			}

			// Clean build directory
			await this.cleanBuildDir(packageInfo.distDir);

			// Execute build steps
			for (const step of BUILD_CONFIG.buildSteps) {
				switch (step) {
					case "bundle":
						await this.buildBundle(packageInfo);
						break;
					case "declarations":
						await this.buildDeclarations(packageInfo);
						break;
					default:
						this.logger.warn(`Unknown build step: ${step}`);
				}
			}

			// Validate build artifacts
			await validateBuildArtifacts(packageInfo.dir, packageName);

			// Update cache
			await updateCache(packageInfo.dir, packageInfo.cacheDir);

			// Calculate and report metrics
			const metrics = await this.calculateMetrics(packageInfo, buildStart);
			this.logger.metrics(packageName, metrics);

			this.logger.info(`Build completed for @hellajs/${packageName}`);
			return { success: true, cached: false, packageName, metrics };

		} catch (error) {
			if (retryCount < BUILD_CONFIG.maxRetries) {
				this.logger.warn(`Build failed for ${packageName}, retrying... (${retryCount + 1}/${BUILD_CONFIG.maxRetries})`);
				// Wait before retry with exponential backoff
				await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
				return this.buildPackage(packageName, retryCount + 1);
			}

			this.logger.error(`Build failed for ${packageName}`, {
				error: error.message,
				retries: retryCount,
				duration: Math.round(performance.now() - buildStart),
			});

			return { success: false, error: error.message, packageName };
		}
	}
}

// ===== PARALLEL BUILD ORCHESTRATOR =====

/**
 * Orchestrates parallel builds while respecting dependencies
 */
class BuildOrchestrator {
	constructor(logger, projectRoot = null) {
		this.logger = logger;
		this.builder = new PackageBuilder(logger, projectRoot);
		this.activeBuilds = new Set();
		this.completed = new Set();
		this.results = [];
	}

	/**
	 * Check if package dependencies are satisfied
	 */
	canBuildPackage(packageName) {
		const deps = DEPENDENCY_GRAPH[packageName] || [];
		return deps.every(dep => this.completed.has(dep));
	}

	/**
	 * Get packages ready to build
	 */
	getReadyPackages(packages) {
		return packages.filter(pkg =>
			!this.completed.has(pkg) &&
			!this.activeBuilds.has(pkg) &&
			this.canBuildPackage(pkg)
		);
	}

	/**
	 * Build packages in parallel with dependency awareness
	 */
	async buildPackagesParallel(packages) {
		const totalPackages = packages.length;
		let remainingPackages = [...packages];

		this.logger.info(`Building ${totalPackages} packages with parallelism=${BUILD_CONFIG.maxParallel}`);

		// Progress reporting
		const progressTimer = setInterval(() => {
			const completed = this.completed.size;
			const active = this.activeBuilds.size;
			const remaining = remainingPackages.length - active;
			this.logger.info(`Progress: ${completed}/${totalPackages} completed, ${active} active, ${remaining} pending`);
		}, BUILD_CONFIG.progressInterval);

		while (remainingPackages.length > 0) {
			const readyPackages = this.getReadyPackages(remainingPackages);
			const packagesToStart = readyPackages.slice(0, BUILD_CONFIG.maxParallel - this.activeBuilds.size);

			if (packagesToStart.length === 0) {
				// Wait for at least one build to complete
				await new Promise(resolve => setTimeout(resolve, 100));
				continue;
			}

			// Start builds for ready packages
			const buildPromises = packagesToStart.map(async (packageName) => {
				this.activeBuilds.add(packageName);

				try {
					const result = await this.builder.buildPackage(packageName);
					this.results.push(result);
					this.completed.add(packageName);

					// Stop immediately if core fails
					if (!result.success && packageName === "core") {
						throw new Error("Core build failed - stopping build process");
					}

				} catch (error) {
					this.results.push({ success: false, error: error.message, packageName });
					throw error;
				} finally {
					this.activeBuilds.delete(packageName);
					remainingPackages = remainingPackages.filter(pkg => pkg !== packageName);
				}
			});

			// Wait for any build to complete before continuing
			try {
				await Promise.race(buildPromises);
			} catch (error) {
				clearInterval(progressTimer);
				// Wait for all active builds to complete before throwing
				await Promise.allSettled(buildPromises);
				throw error;
			}
		}

		clearInterval(progressTimer);

		// Wait for all remaining builds to complete
		while (this.activeBuilds.size > 0) {
			await new Promise(resolve => setTimeout(resolve, 100));
		}
	}

	/**
	 * Generate build summary report
	 */
	generateSummary() {
		const successful = this.results.filter(r => r.success);
		const failed = this.results.filter(r => !r.success);
		const cached = successful.filter(r => r.cached);

		const totalDuration = this.results
			.filter(r => r.metrics)
			.reduce((sum, r) => sum + r.metrics.duration, 0);

		const totalBundleSize = this.results
			.filter(r => r.metrics)
			.reduce((sum, r) => sum + r.metrics.bundleSize, 0);

		return {
			total: this.results.length,
			successful: successful.length,
			failed: failed.length,
			cached: cached.length,
			failedPackages: failed.map(f => ({ name: f.packageName, error: f.error })),
			totalDuration,
			totalBundleSize,
			peakMemory: getMemoryUsage(),
		};
	}
}

// ===== MAIN EXECUTION =====

// Parse command line arguments
const args = process.argv.slice(2);
const isQuiet = args.includes("--quiet");
const buildAll = args.includes("--all");
const enableCache = !args.includes("--no-cache");
const maxParallel = parseInt(args.find(arg => arg.startsWith("--parallel="))?.split("=")[1]) || BUILD_CONFIG.maxParallel;
const logLevel = args.find(arg => arg.startsWith("--log-level="))?.split("=")[1] || "info";
const customProjectRoot = args.find(arg => arg.startsWith("--project-root="))?.split("=")[1];
const packageName = args.find(arg => !arg.startsWith("--"));

// Update configuration based on CLI args
BUILD_CONFIG.enableCache = enableCache;
BUILD_CONFIG.maxParallel = maxParallel;
BUILD_CONFIG.logLevel = logLevel;

// Initialize logger
const logger = new Logger(BUILD_CONFIG.logLevel, isQuiet);

// Make logger globally available for utility functions
globalThis.logger = logger;

/**
 * Main entry point
 */
async function main() {
	const mainStart = performance.now();

	try {
		logger.info("HellaJS Build System v2.0", {
			nodeVersion: process.version,
			platform: os.platform(),
			arch: os.arch(),
			cpus: os.cpus().length,
			maxParallel: BUILD_CONFIG.maxParallel,
			cacheEnabled: BUILD_CONFIG.enableCache,
		});

		if (buildAll) {
			await buildAllPackages();
		} else {
			await buildSinglePackage();
		}

		const totalDuration = Math.round(performance.now() - mainStart);
		logger.info(`Build system completed in ${totalDuration}ms`);

	} catch (error) {
		logger.error("Build system failed", {
			error: error.message,
			duration: Math.round(performance.now() - mainStart),
		});
		process.exit(1);
	}
}

/**
 * Build all packages with parallel execution
 */
async function buildAllPackages() {
	const projectRoot = customProjectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const packagesDir = path.join(projectRoot, "packages");

	if (!fsStat.existsSync(packagesDir)) {
		throw new Error("Packages directory not found");
	}

	// Get available packages
	const availablePackages = (await fs.readdir(packagesDir)).filter(pkg => {
		const pkgDir = path.join(packagesDir, pkg);
		return fsStat.statSync(pkgDir).isDirectory() &&
			fsStat.existsSync(path.join(pkgDir, "package.json"));
	});

	// Build packages in defined order, but only if they exist
	const packagesToBuild = BUILD_ORDER.filter(pkg => availablePackages.includes(pkg));
	const remainingPackages = availablePackages.filter(pkg => !BUILD_ORDER.includes(pkg));
	packagesToBuild.push(...remainingPackages);

	logger.info(`Discovered ${availablePackages.length} packages`, {
		packages: packagesToBuild,
		buildOrder: BUILD_ORDER.filter(pkg => availablePackages.includes(pkg)),
	});

	// Build packages with parallel orchestration
	const orchestrator = new BuildOrchestrator(logger, projectRoot);
	await orchestrator.buildPackagesParallel(packagesToBuild);

	// Generate and log summary
	const summary = orchestrator.generateSummary();

	logger.info("Build Summary", summary);

	if (summary.failed > 0) {
		logger.error("Some packages failed to build", {
			failedPackages: summary.failedPackages,
		});
		process.exit(1);
	}

	logger.info("All packages built successfully! 🎉");
}

/**
 * Build single package
 */
async function buildSinglePackage() {
	if (!packageName) {
		logger.error("Package name is required for single package build");
		console.error("Usage: bun run bundle <package> [options]");
		console.error("       bun run bundle --all [options]");
		console.error("\nOptions:");
		console.error("  --quiet              Suppress info logs");
		console.error("  --no-cache           Disable build cache");
		console.error("  --parallel=N         Max parallel builds (default: CPU count)");
		console.error("  --log-level=LEVEL    Set log level (error|warn|info|debug)");
		console.error("  --project-root=PATH  Override project root directory");
		process.exit(1);
	}

	const projectRoot = customProjectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const builder = new PackageBuilder(logger, projectRoot);
	const result = await builder.buildPackage(packageName);

	if (!result.success) {
		logger.error("Build failed", { package: packageName, error: result.error });
		process.exit(1);
	}

	logger.info("Package built successfully! ✨");
}

// Export functions for testing
if (process.env.NODE_ENV === 'test') {
	// Export internal functions for unit testing
	globalThis.__bundleTestExports = {
		calculateFileHash,
		getAllSourceFiles,
		scanDirectoryRecursive,
		isCacheValid,
		updateCache,
		cleanCache,
		BUILD_CONFIG
	};
}

// Start the build system (only if not in test mode)
if (process.env.NODE_ENV !== 'test') {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}