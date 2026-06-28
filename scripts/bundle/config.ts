import fsStat from "node:fs";
import os from "node:os";
import path from "node:path";
import { packagesDir } from "../utils/index.js";

export interface BuildMetrics {
  bundleSize: number;
  gzipSize: number;
  path?: string;
}

export interface BuildResult {
  success: boolean;
  cached: boolean | string;
  packageName: string;
  error?: string;
  metrics?: Record<string, unknown>;
}

export interface BuildSummary {
  total: number;
  successful: number;
  failed: number;
  cached: number;
  failedPackages: { name: string; error: string }[];
}

export interface PackageGraph {
  buildOrder: string[];
  getDependencies(packageName: string): string[];
}

export const BUILD_CONFIG = {
  maxParallel: Math.min(os.cpus().length, 4),
  maxRetries: 2,
  buildTimeout: 120000,
  cacheDir: ".build-cache",
  enableCache: true,
  buildSteps: ["bundle", "declarations"],
};

export const VARIANTS = [
  { suffix: "", terser: false as const },
  { suffix: ".min", terser: { mangle: true } },
];

/**
 * Derive topological build order from package.json dependency declarations.
 */
export function derivePackageGraph(): PackageGraph {
  const graph = new Map<string, string[]>();
  const packageNames: string[] = [];

  if (!fsStat.existsSync(packagesDir)) {
    return { buildOrder: [], getDependencies: () => [] };
  }

  const entries = fsStat.readdirSync(packagesDir);
  for (const entry of entries) {
    const pkgJsonPath = path.join(packagesDir, entry, "package.json");
    if (!fsStat.existsSync(pkgJsonPath)) continue;

    try {
      const raw = fsStat.readFileSync(pkgJsonPath, "utf8");
      const pkgJson = JSON.parse(raw);
      const name = pkgJson.name as string;
      if (!name || !name.startsWith("@hellajs/")) continue;

      const localName = name.replace("@hellajs/", "");
      const deps = new Set<string>();
      const allDeps = {
        ...(pkgJson.dependencies as Record<string, string> || {}),
        ...(pkgJson.peerDependencies as Record<string, string> || {}),
      };

      for (const depName of Object.keys(allDeps)) {
        if (depName.startsWith("@hellajs/")) {
          deps.add(depName.replace("@hellajs/", ""));
        }
      }

      graph.set(localName, Array.from(deps));
      packageNames.push(localName);
    } catch {
      // skip
    }
  }

  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const [name, deps] of graph) {
    if (!inDegree.has(name)) inDegree.set(name, 0);
    for (const dep of deps) {
      if (!adjacency.has(dep)) adjacency.set(dep, []);
      adjacency.get(dep)!.push(name);
      inDegree.set(name, (inDegree.get(name) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) queue.push(name);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const node = queue.shift()!;
    sorted.push(node);
    for (const neighbor of adjacency.get(node) || []) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  for (const name of packageNames) {
    if (!sorted.includes(name)) sorted.push(name);
  }

  return {
    buildOrder: sorted,
    getDependencies(packageName: string): string[] {
      return graph.get(packageName) || [];
    },
  };
}
