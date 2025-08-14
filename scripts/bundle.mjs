import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import fsStat from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const BUILD_CONFIG = {
	maxParallel: Math.min(os.cpus().length, 4),
	maxRetries: 2,
	buildTimeout: 120000,
	cacheDir: ".build-cache",
	enableCache: true,
	buildSteps: ["bundle", "declarations"],
};

const BUILD_ORDER = ["core", "css", "dom", "store", "router", "resource"];
const DEPENDENCY_GRAPH = {
	core: [],
	css: ["core"],
	dom: ["core"],
	store: ["core"],
	router: ["core"],
	resource: ["core"],
};

class Logger {
	error(message, context) {
		console.error(`[ERROR] ${message}`, context || "");
	}
	size(packageName, metrics) {
		console.log(`[SIZE] ${packageName}: ${metrics.bundleSize}KB (gzipped: ${metrics.gzipSize}KB)`);
	}
	final(success, failedPackages) {
		if (success) {
			console.log("✅ All packages built successfully!");
		} else {
			console.error("❌ Some packages failed to build:", failedPackages);
		}
	}
}

function execCommand(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const { timeout = BUILD_CONFIG.buildTimeout, ...spawnOptions } = options;
		const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"], ...spawnOptions });
		let stdout = "", stderr = "", timer;
		if (timeout) {
			timer = setTimeout(() => {
				child.kill("SIGKILL");
				reject(new Error(`Command timed out after ${timeout}ms: ${command} ${args.join(" ")}`));
			}, timeout);
		}
		child.stdout?.on("data", (data) => { stdout += data; });
		child.stderr?.on("data", (data) => { stderr += data; });
		child.on("close", (code) => {
			if (timer) clearTimeout(timer);
			if (code === 0) resolve({ stdout, stderr, code });
			else reject(new Error(`Command failed with code ${code}: ${command} ${args.join(" ")}\nStderr: ${stderr}`));
		});
		child.on("error", (error) => {
			if (timer) clearTimeout(timer);
			reject(error);
		});
	});
}

async function calculateFileHash(filePath) {
	try {
		const content = await fs.readFile(filePath);
		return createHash("sha256").update(content).digest("hex");
	} catch (error) {
		if (error.code !== 'ENOENT') console.warn(`Warning: Failed to hash ${filePath}: ${error.message}`);
		return null;
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
		sourceFiles.push(...await scanDirectoryRecursive(libDir, /\.(ts|tsx|js|jsx)$/));
	}
	return sourceFiles;
}

async function scanDirectoryRecursive(dir, pattern) {
	const files = [];
	const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...await scanDirectoryRecursive(fullPath, pattern));
		} else if (entry.isFile() && pattern.test(entry.name)) {
			files.push(fullPath);
		}
	}
	return files;
}

async function isCacheValid(packageDir, cacheDir) {
	if (!BUILD_CONFIG.enableCache) return false;
	try {
		const cacheFile = path.join(cacheDir, "build-cache.json");
		if (!fsStat.existsSync(cacheFile)) return false;
		const cacheData = JSON.parse(await fs.readFile(cacheFile, "utf8"));
		if (!cacheData?.hashes || typeof cacheData.hashes !== 'object') return false;
		const currentFiles = (await getAllSourceFiles(packageDir)).filter(fsStat.existsSync);
		const cachedFiles = Object.keys(cacheData.hashes);
		if (cachedFiles.length !== currentFiles.length) return false;
		if (currentFiles.some(f => !(f in cacheData.hashes))) return false;
		if (cachedFiles.some(f => !fsStat.existsSync(f))) return false;
		const hashResults = await Promise.all(currentFiles.map(async file =>
			(await calculateFileHash(file)) === cacheData.hashes[file]
		));
		return hashResults.every(Boolean) && cacheData.metrics || true;
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
		await fs.mkdir(cacheDir, { recursive: true });
	} catch (error) {
		console.warn('Failed to clean cache directory', { cacheDir, error: error.message });
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
			metrics
		};
		const cacheFile = path.join(cacheDir, "build-cache.json");
		await fs.writeFile(cacheFile, JSON.stringify(cacheData, null, 2));
	} catch (error) {
		console.warn('Failed to update cache', { packageDir, error: error.message });
		cleanCache(cacheDir).catch(cleanError => {
			console.warn('Failed to clean cache after update failure', {
				cacheDir,
				originalError: error.message,
				cleanError: cleanError.message
			});
		});
	}
}

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

class PackageBuilder {
	constructor(logger, projectRoot = null) {
		this.logger = logger;
		this.projectRoot = projectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	}
	async getPackageInfo(packageName) {
		const packageDir = path.join(this.projectRoot, "packages", packageName);
		const packageJsonPath = path.join(packageDir, "package.json");
		const entryPoint = path.join(packageDir, "lib/index.ts");
		const tsconfigPath = path.join(packageDir, "tsconfig.json");
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
	async cleanBuildDir(distDir) {
		if (fsStat.existsSync(distDir)) {
			await fs.rm(distDir, { recursive: true, force: true });
		}
		await fs.mkdir(distDir, { recursive: true });
	}
	async buildBundle(packageInfo) {
		const { name, dir, distDir, peerDeps } = packageInfo;
		const bundlePath = path.join(distDir, `${name}.js`);
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
		await execCommand("bun", buildArgs, { cwd: this.projectRoot });
		const libBundle = path.join(dir, "lib", `${name}.js`);
		const libSourceMap = path.join(dir, "lib", `${name}.js.map`);
		if (fsStat.existsSync(libBundle)) {
			await fs.rename(libBundle, bundlePath);
		}
		if (fsStat.existsSync(libSourceMap)) {
			await fs.rename(libSourceMap, path.join(distDir, `${name}.js.map`));
		}
	}
	async buildDeclarations(packageInfo) {
		const { distDir, tsconfigPath } = packageInfo;
		const tscPath = path.join(this.projectRoot, "node_modules/typescript/bin/tsc");
		const tscArgs = [
			tscPath,
			"--project",
			tsconfigPath,
			"--emitDeclarationOnly",
			"--outDir",
			distDir,
		];
		await execCommand("node", tscArgs, { cwd: this.projectRoot });
	}
	async calculateMetrics(packageInfo) {
		const { name, distDir } = packageInfo;
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
	async buildPackage(packageName, retryCount = 0) {
		try {
			const packageInfo = await this.getPackageInfo(packageName);
			const distDir = packageInfo.distDir;
			const distFile = path.join(distDir, `${packageName}.js`);
			const cacheValid = await isCacheValid(packageInfo.dir, packageInfo.cacheDir);
			const distExists = fsStat.existsSync(distFile);
			if (cacheValid && distExists) {
				if (cacheValid.bundleSize !== undefined) {
					this.logger.size(packageName, cacheValid);
				}
				return { success: true, cached: true, packageName, metrics: cacheValid };
			}
			if (cacheValid && !distExists) {
				await this.cleanBuildDir(distDir);
				for (const step of BUILD_CONFIG.buildSteps) {
					switch (step) {
						case "bundle":
							await this.buildBundle(packageInfo);
							break;
						case "declarations":
							await this.buildDeclarations(packageInfo);
							break;
					}
				}
				await validateBuildArtifacts(packageInfo.dir, packageName);
				const metrics = await this.calculateMetrics(packageInfo);
				await updateCache(packageInfo.dir, packageInfo.cacheDir, metrics);
				return { success: true, cached: false, packageName, metrics };
			}
			await this.cleanBuildDir(distDir);
			for (const step of BUILD_CONFIG.buildSteps) {
				switch (step) {
					case "bundle":
						await this.buildBundle(packageInfo);
						break;
					case "declarations":
						await this.buildDeclarations(packageInfo);
						break;
				}
			}
			await validateBuildArtifacts(packageInfo.dir, packageName);
			const metrics = await this.calculateMetrics(packageInfo);
			await updateCache(packageInfo.dir, packageInfo.cacheDir, metrics);
			return { success: true, cached: false, packageName, metrics };
		} catch (error) {
			if (retryCount < BUILD_CONFIG.maxRetries) {
				await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
				return this.buildPackage(packageName, retryCount + 1);
			}
			this.logger.error(`Build failed for ${packageName}`, { error: error.message });
			return { success: false, error: error.message, packageName };
		}
	}
}

class BuildOrchestrator {
	constructor(logger, projectRoot = null) {
		this.logger = logger;
		this.builder = new PackageBuilder(logger, projectRoot);
		this.activeBuilds = new Set();
		this.completed = new Set();
		this.results = [];
	}
	canBuildPackage(packageName) {
		const deps = DEPENDENCY_GRAPH[packageName] || [];
		return deps.length === 0 || deps.every(dep => this.completed.has(dep));
	}
	getReadyPackages(packages) {
		return packages.filter(pkg =>
			!this.completed.has(pkg) &&
			!this.activeBuilds.has(pkg) &&
			this.canBuildPackage(pkg)
		);
	}
	async buildPackagesParallel(packages) {
		let remainingPackages = [...packages];
		while (remainingPackages.length > 0) {
			const slots = BUILD_CONFIG.maxParallel - this.activeBuilds.size;
			if (slots <= 0) {
				await new Promise(r => setTimeout(r, 100));
				continue;
			}
			const readyPackages = this.getReadyPackages(remainingPackages);
			const packagesToStart = readyPackages.slice(0, slots);
			if (!packagesToStart.length) {
				await new Promise(r => setTimeout(r, 100));
				continue;
			}
			const buildPromises = packagesToStart.map(async (packageName) => {
				this.activeBuilds.add(packageName);
				try {
					const result = await this.builder.buildPackage(packageName);
					this.results.push(result);
					this.completed.add(packageName);
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
			await Promise.race(buildPromises);
		}
		while (this.activeBuilds.size > 0) {
			await new Promise(r => setTimeout(r, 100));
		}
	}
	generateSummary() {
		const successful = this.results.filter(r => r.success);
		const failed = this.results.filter(r => !r.success);
		const cached = successful.filter(r => r.cached);
		return {
			total: this.results.length,
			successful: successful.length,
			failed: failed.length,
			cached: cached.length,
			failedPackages: failed.map(f => ({ name: f.packageName, error: f.error })),
		};
	}
}

const args = process.argv.slice(2);
const buildAll = args.includes("--all");
const enableCache = !args.includes("--no-cache");
const maxParallel = parseInt(args.find(arg => arg.startsWith("--parallel="))?.split("=")[1]) || BUILD_CONFIG.maxParallel;
const customProjectRoot = args.find(arg => arg.startsWith("--project-root="))?.split("=")[1];
const packageName = args.find(arg => !arg.startsWith("--"));

BUILD_CONFIG.enableCache = enableCache;
BUILD_CONFIG.maxParallel = maxParallel;

const logger = new Logger();

globalThis.logger = logger;

async function main() {
	try {
		if (buildAll) {
			await buildAllPackages();
			const summary = globalThis._buildSummary;
			logger.final(summary.successful === summary.total, summary.failedPackages);
		} else {
			await buildSinglePackage();
			const result = globalThis._buildSummary;
			if (result.successful === 1 && result.failed === 0 && result.total === 1) {
				const metrics = result.failedPackages.length === 0 && result.metrics ? result.metrics : null;
				const pkg = packageName;
				if (metrics) {
					logger.size(pkg, metrics);
				} else {
					console.log(`✅ Package built: ${pkg}`);
				}
			}
		}
	} catch (error) {
		logger.error("Build system failed", { error: error.message });
		process.exit(1);
	}
}

async function buildAllPackages() {
	const projectRoot = customProjectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const packagesDir = path.join(projectRoot, "packages");
	if (!fsStat.existsSync(packagesDir)) {
		throw new Error("Packages directory not found");
	}
	const availablePackages = (await fs.readdir(packagesDir)).filter(pkg => {
		const pkgDir = path.join(packagesDir, pkg);
		return fsStat.statSync(pkgDir).isDirectory() &&
			fsStat.existsSync(path.join(pkgDir, "package.json"));
	});
	const packagesToBuild = BUILD_ORDER.filter(pkg => availablePackages.includes(pkg));
	const remainingPackages = availablePackages.filter(pkg => !BUILD_ORDER.includes(pkg));
	packagesToBuild.push(...remainingPackages);
	const orchestrator = new BuildOrchestrator(logger, projectRoot);
	await orchestrator.buildPackagesParallel(packagesToBuild);
	const summary = orchestrator.generateSummary();
	globalThis._buildSummary = summary;
	for (const r of orchestrator.results) {
		if (r.metrics && !r.cached) logger.size(r.packageName, r.metrics);
	}
	if (summary.failed > 0) {
		logger.error("Some packages failed to build", { failedPackages: summary.failedPackages });
		process.exit(1);
	}
}

async function buildSinglePackage() {
	if (!packageName) {
		logger.error("Package name is required for single package build");
		process.exit(1);
	}
	const projectRoot = customProjectRoot || path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const builder = new PackageBuilder(logger, projectRoot);
	const result = await builder.buildPackage(packageName);
	if (!result.success) {
		logger.error("Build failed", { package: packageName, error: result.error });
		process.exit(1);
	}
	if (result.metrics && !result.cached) logger.size(packageName, result.metrics);
	globalThis._buildSummary = { total: 1, successful: result.success ? 1 : 0, failed: result.success ? 0 : 1, failedPackages: result.success ? [] : [{ name: packageName, error: result.error }] };
}

if (process.env.NODE_ENV !== 'test') {
	main().catch((error) => {
		console.error("Fatal error:", error);
		process.exit(1);
	});
}