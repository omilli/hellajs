import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fsStat from "node:fs";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { ensureDir, logger, scanDirRecursive } from "./utils/common.js";

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

const loggerSize = (packageName, metrics) => {
	logger.info(
		`[SIZE] ${packageName}: ${metrics.bundleSize}KB (gzipped: ${metrics.gzipSize}KB)`,
	);
};

const loggerFinal = (success, failedPackages) => {
	if (success) {
		logger.final(true, 0);
	} else {
		logger.final(false, failedPackages.length);
		logger.error("Some packages failed to build:", failedPackages);
	}
};

function execCommand(command, args = [], options = {}) {
	return new Promise((resolve, reject) => {
		const { timeout = BUILD_CONFIG.buildTimeout, ...spawnOptions } = options;
		const child = spawn(command, args, {
			stdio: ["pipe", "pipe", "pipe"],
			...spawnOptions,
		});
		let stdout = "",
			stderr = "",
			timer;
		if (timeout) {
			timer = setTimeout(() => {
				child.kill("SIGKILL");
				reject(
					new Error(
						`Command timed out after ${timeout}ms: ${command} ${args.join(" ")}`,
					),
				);
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
			if (code === 0) resolve({ stdout, stderr, code });
			else
				reject(
					new Error(
						`Command failed with code ${code}: ${command} ${args.join(" ")}\nStderr: ${stderr}`,
					),
				);
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
		if (error.code !== "ENOENT")
			console.warn(`Warning: Failed to hash ${filePath}: ${error.message}`);
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

async function getPackageInfo(packageName, projectRoot) {
	const packageDir = path.join(projectRoot, "packages", packageName);
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

async function cleanBuildDir(distDir) {
	if (fsStat.existsSync(distDir)) {
		await fs.rm(distDir, { recursive: true, force: true });
	}
	await ensureDir(distDir);
}

async function buildBundle(packageInfo, projectRoot) {
	const { name, dir, distDir, peerDeps } = packageInfo;
	const bundlePath = path.join(distDir, `${name}.js`);
	const externals = peerDeps.flatMap((dep) => ["--external", dep]);
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
	await execCommand("bun", buildArgs, { cwd: projectRoot });
	const libBundle = path.join(dir, "lib", `${name}.js`);
	const libSourceMap = path.join(dir, "lib", `${name}.js.map`);
	if (fsStat.existsSync(libBundle)) {
		await fs.rename(libBundle, bundlePath);
	}
	if (fsStat.existsSync(libSourceMap)) {
		await fs.rename(libSourceMap, path.join(distDir, `${name}.js.map`));
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

async function calculateMetrics(packageInfo) {
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

async function buildPackage(packageName, projectRoot, retryCount = 0) {
	try {
		const packageInfo = await getPackageInfo(packageName, projectRoot);
		const distDir = packageInfo.distDir;
		const distFile = path.join(distDir, `${packageName}.js`);
		const cacheValid = await isCacheValid(
			packageInfo.dir,
			packageInfo.cacheDir,
		);
		const distExists = fsStat.existsSync(distFile);
		if (cacheValid && distExists) {
			if (cacheValid.bundleSize !== undefined) {
				loggerSize(packageName, cacheValid);
			}
			return { success: true, cached: true, packageName, metrics: cacheValid };
		}
		if (cacheValid && !distExists) {
			await cleanBuildDir(distDir);
			for (const step of BUILD_CONFIG.buildSteps) {
				switch (step) {
					case "bundle":
						await buildBundle(packageInfo, projectRoot);
						break;
					case "declarations":
						await buildDeclarations(packageInfo, projectRoot);
						break;
				}
			}
			await validateBuildArtifacts(packageInfo.dir, packageName);
			const metrics = await calculateMetrics(packageInfo);
			await updateCache(packageInfo.dir, packageInfo.cacheDir, metrics);
			return { success: true, cached: false, packageName, metrics };
		}
		await cleanBuildDir(distDir);
		for (const step of BUILD_CONFIG.buildSteps) {
			switch (step) {
				case "bundle":
					await buildBundle(packageInfo, projectRoot);
					break;
				case "declarations":
					await buildDeclarations(packageInfo, projectRoot);
					break;
			}
		}
		await validateBuildArtifacts(packageInfo.dir, packageName);
		const metrics = await calculateMetrics(packageInfo);
		await updateCache(packageInfo.dir, packageInfo.cacheDir, metrics);
		return { success: true, cached: false, packageName, metrics };
	} catch (error) {
		if (retryCount < BUILD_CONFIG.maxRetries) {
			await new Promise((resolve) =>
				setTimeout(resolve, 1000 * 2 ** retryCount),
			);
			return buildPackage(packageName, projectRoot, retryCount + 1);
		}
		logger.error(`Build failed for ${packageName}`, { error: error.message });
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
const buildAll = args.includes("--all");
const enableCache = !args.includes("--no-cache");
const maxParallel =
	parseInt(args.find((arg) => arg.startsWith("--parallel="))?.split("=")[1]) ||
	BUILD_CONFIG.maxParallel;
const customProjectRoot = args
	.find((arg) => arg.startsWith("--project-root="))
	?.split("=")[1];
const packageName = args.find((arg) => !arg.startsWith("--"));

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
				if (metrics) {
					loggerSize(pkg, metrics);
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
	const projectRoot =
		customProjectRoot ||
		path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const packagesDir = path.join(projectRoot, "packages");
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
	const results = await buildPackagesParallel(
		packagesToBuild,
		buildPackage,
		projectRoot,
	);
	const summary = generateSummary(results);
	globalThis._buildSummary = summary;
	for (const r of results) {
		if (r.metrics && !r.cached) loggerSize(r.packageName, r.metrics);
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
	const projectRoot =
		customProjectRoot ||
		path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
	const result = await buildPackage(packageName, projectRoot);
	if (!result.success) {
		logger.error("Build failed", { package: packageName, error: result.error });
		process.exit(1);
	}
	if (result.metrics && !result.cached) loggerSize(packageName, result.metrics);
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
