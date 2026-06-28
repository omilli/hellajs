import fsStat from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  logger,
  getPackageInfo,
  projectRoot,
} from "../utils/index.js";
import {
  BUILD_CONFIG,
  derivePackageGraph,
  type BuildMetrics,
  type BuildResult,
  type BuildSummary,
} from "./config.js";
import { cleanCache, isCacheValid, updateCache } from "./cache.js";
import { buildBundle, buildIndividualModules } from "./esbuild-build.js";
import { buildDeclarations, copyDeclarationFiles } from "./declarations.js";
import { validateBuildArtifacts } from "./validate.js";
import { calculateMetrics } from "./metrics.js";

const PACKAGE_GRAPH = derivePackageGraph();

async function cleanBuildDir(distDir: string): Promise<void> {
  if (fsStat.existsSync(distDir)) {
    await fs.rm(distDir, { recursive: true, force: true });
  }
  await ensureDir(distDir);
}

function canBuildPackage(
  packageName: string,
  completed: Set<string>,
): boolean {
  const deps = PACKAGE_GRAPH.getDependencies(packageName);
  return deps.every((dep) => completed.has(dep));
}

function getReadyPackages(
  packages: string[],
  completed: Set<string>,
  activeBuilds: Set<string>,
): string[] {
  return packages.filter(
    (pkg) =>
      !completed.has(pkg) &&
      !activeBuilds.has(pkg) &&
      canBuildPackage(pkg, completed),
  );
}

async function buildSinglePackageEntry(
  packageName: string,
  cwd: string,
  retryCount = 0,
  bundleMode = "dev",
  shouldClean = false,
): Promise<BuildResult> {
  try {
    const packageInfo = await getPackageInfo(packageName);
    const { distDir, dir, cacheDir } = packageInfo;
    const distFile = path.join(distDir, "bundle.js");

    if (shouldClean) {
      await cleanBuildDir(distDir);
      await cleanCache(cacheDir);
    }

    const cacheValid = await isCacheValid(dir, cacheDir);
    const distExists = fsStat.existsSync(distFile);

    if (cacheValid && distExists) {
      return { success: true, cached: true, packageName, metrics: {} };
    }

    await cleanBuildDir(distDir);

    const bundleMetrics = await buildBundle(packageInfo, cwd, bundleMode);
    const moduleMetrics = await buildIndividualModules(packageInfo, cwd);
    const allMetrics = { ...bundleMetrics, ...moduleMetrics };

    await buildDeclarations(packageInfo, cwd);
    await copyDeclarationFiles(packageInfo);
    await validateBuildArtifacts(dir);

    const metrics = await calculateMetrics(packageInfo, allMetrics);
    await updateCache(dir, cacheDir, metrics);

    return { success: true, cached: false, packageName, metrics };
  } catch (error) {
    if (retryCount < BUILD_CONFIG.maxRetries) {
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * 2 ** retryCount),
      );
      return buildSinglePackageEntry(
        packageName,
        cwd,
        retryCount + 1,
        bundleMode,
        shouldClean,
      );
    }
    logger.error(
      `Build failed for ${packageName}: ${(error as Error).message}`,
    );
    return {
      success: false,
      cached: false,
      error: (error as Error).message,
      packageName,
    };
  }
}

/**
 * Build packages in parallel, respecting the dependency graph.
 * Waits for dependencies to complete before starting downstream packages.
 */
export async function buildPackagesParallel(
  packages: string[],
  builder: (packageName: string, cwd: string) => Promise<BuildResult>,
  cwd: string,
): Promise<BuildResult[]> {
  const activeBuilds = new Set<string>();
  const completed = new Set<string>();
  const results: BuildResult[] = [];
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

    const buildPromises = packagesToStart.map(async (pkg) => {
      activeBuilds.add(pkg);
      try {
        const result = await builder(pkg, cwd);
        results.push(result);
        completed.add(pkg);
        if (!result.success && pkg === "core") {
          throw new Error("Core build failed - stopping build process");
        }
      } catch (error) {
        results.push({
          success: false,
          cached: false,
          error: (error as Error).message,
          packageName: pkg,
        });
        throw error;
      } finally {
        activeBuilds.delete(pkg);
        remainingPackages = remainingPackages.filter((p) => p !== pkg);
      }
    });

    await Promise.race(buildPromises);
  }

  while (activeBuilds.size > 0) {
    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}

function generateSummary(results: BuildResult[]): BuildSummary {
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
      error: f.error || "",
    })),
  };
}

/**
 * Build a single package by name (thin wrapper with retry count default).
 */
export function buildPackageEntry(
  packageName: string,
  cwd: string,
  bundleMode: string,
  shouldClean: boolean,
): Promise<BuildResult> {
  return buildSinglePackageEntry(
    packageName,
    cwd,
    0,
    bundleMode,
    shouldClean,
  );
}

/**
 * Build all available packages in dependency order, then any remaining packages.
 */
export async function buildAllPackagesFromOrder(
  packagesDir: string,
  buildOrder: string[],
  bundleMode: string,
  shouldClean: boolean,
): Promise<{ results: BuildResult[]; summary: BuildSummary }> {
  const availablePackages = (await fs.readdir(packagesDir)).filter((pkg) => {
    const pkgDir = path.join(packagesDir, pkg);
    return (
      fsStat.statSync(pkgDir).isDirectory() &&
      fsStat.existsSync(path.join(pkgDir, "package.json"))
    );
  });

  const packagesToBuild = [
    ...buildOrder.filter((pkg) => availablePackages.includes(pkg)),
    ...availablePackages.filter((pkg) => !buildOrder.includes(pkg)),
  ];

  const buildWrapper = (
    packageName: string,
    cwd: string,
  ): Promise<BuildResult> =>
    buildSinglePackageEntry(packageName, cwd, 0, bundleMode, shouldClean);

  const results = await buildPackagesParallel(
    packagesToBuild,
    buildWrapper,
    projectRoot,
  );
  const summary = generateSummary(results);

  return { results, summary };
}

const METRIC_KEYS = [".min", "min"] as const;

function extractMinified(
  metrics: Record<string, unknown>,
): BuildMetrics | undefined {
  for (const key of METRIC_KEYS) {
    const m = metrics[key];
    if (m) return m as BuildMetrics;
  }
}

/**
 * Print the build summary and exit with the appropriate code.
 */
export function reportSummary(
  results: BuildResult[],
  summary: BuildSummary,
): void {
  if (summary.successful > 0) {
    logger.info("\nBuild Summary:");
    results
      .filter((r) => r.success)
      .forEach((result) => {
        logger.info(`@hellajs/${result.packageName}`);
        const metrics = result.metrics;
        if (metrics && typeof metrics === "object") {
          const m = extractMinified(metrics as Record<string, unknown>);
          if (m) logger.info(`   ${m.bundleSize}KB (${m.gzipSize}KB gzipped)`);
        }
      });
  }

  if (summary.failed > 0) {
    logger.error(
      `Some packages failed to build: ${JSON.stringify(summary.failedPackages)}`,
    );
    process.exit(1);
  } else {
    logger.success("All packages built successfully!");
  }
}

/**
 * Print the single-package build result and exit with the appropriate code.
 */
export function reportSingleResult(
  packageName: string,
  result: BuildResult,
): void {
  if (!result.success) {
    logger.error(
      `Build failed for package ${packageName}: ${result.error}`,
    );
    process.exit(1);
  }

  const metrics = result.metrics;
  logger.info(`\n@hellajs/${packageName}`);
  if (metrics && typeof metrics === "object") {
    const m = extractMinified(metrics as Record<string, unknown>);
    if (m) logger.info(`   ${m.bundleSize}KB (${m.gzipSize}KB gzipped)`);
  }

  logger.success(`Successfully built ${packageName}`);
}
