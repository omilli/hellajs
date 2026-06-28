import fs from "node:fs";
import path from "node:path";
import { logger, packagesDir } from "./utils/index.js";

interface Violation {
  package: string;
  file: string;
  type: string;
}

/**
 * Returns the basename (without extension) of a .d.ts file path.
 * @param relPath Relative path under lib/ (e.g. "types/nodes.d.ts" or "types.d.ts")
 * @returns The type-name portion (e.g. "nodes" or "types")
 */
function getTypeBasename(relPath: string): string {
  return path.basename(relPath, ".d.ts");
}

/**
 * Checks whether lib/index.ts has a wholesale re-export for the given type basename.
 * @param indexContent Content of lib/index.ts
 * @param typeBase Type basename (e.g. "nodes", "types")
 * @returns True if a matching `export type *` line exists
 */
function isWholesaleExported(indexContent: string, typeBase: string): boolean {
  const escaped = typeBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = typeBase === "types"
    ? `export type \\* from ["']\\./types["']`
    : `export type \\* from ["']\\./types/${escaped}["']`;
  return new RegExp(pattern).test(indexContent);
}

/**
 * Scans a .d.ts file for @internal-tagged exported types/interfaces.
 * @param filePath Full path to the .d.ts file
 * @returns Array of type/interface names with @internal annotations
 */
function scanInternalExports(filePath: string): string[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const names: string[] = [];
  const regex = /\/\*\*[\s\S]*?@internal[\s\S]*?\*\/\s*(?:\r?\n\s*)*export\s+(type|interface)\s+(\w+)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    names.push(match[2]!);
  }
  return names;
}

/**
 * Finds all .d.ts files under packages/{pkg}/lib/types/ and packages/{pkg}/lib/types.d.ts.
 * @returns Array of package name, relative path, and full path
 */
function findTypeFiles(): Array<{ pkg: string; relPath: string; fullPath: string }> {
  const entries = fs.readdirSync(packagesDir, { withFileTypes: true });
  const results: Array<{ pkg: string; relPath: string; fullPath: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const libDir = path.join(packagesDir, entry.name, "lib");
    if (!fs.existsSync(libDir)) continue;

    const singleFile = path.join(libDir, "types.d.ts");
    if (fs.existsSync(singleFile)) {
      results.push({ pkg: entry.name, relPath: "types.d.ts", fullPath: singleFile });
    }

    const typesDir = path.join(libDir, "types");
    if (fs.existsSync(typesDir)) {
      const files = fs.readdirSync(typesDir);
      for (const f of files) {
        if (!f.endsWith(".d.ts")) continue;
        results.push({
          pkg: entry.name,
          relPath: `types/${f}`,
          fullPath: path.join(typesDir, f),
        });
      }
    }
  }

  return results;
}

async function main(): Promise<void> {
  try {
    const violations: Violation[] = [];
    const typeFiles = findTypeFiles();

    for (const { pkg, relPath, fullPath } of typeFiles) {
      const indexPath = path.join(packagesDir, pkg, "lib", "index.ts");
      if (!fs.existsSync(indexPath)) continue;

      const indexContent = fs.readFileSync(indexPath, "utf-8");
      const typeBase = getTypeBasename(relPath);

      if (!isWholesaleExported(indexContent, typeBase)) continue;

      const names = scanInternalExports(fullPath);
      for (const name of names) {
        violations.push({ package: pkg, file: relPath, type: name });
      }
    }

    if (violations.length === 0) {
      logger.success("No @internal types found in wholesale-exported type files");
      process.exit(0);
    }

    for (const v of violations) {
      logger.info(`${v.package}:${v.file}:${v.type} — @internal on type in wholesale-exported .d.ts`);
    }
    process.exit(1);
  } catch (error) {
    logger.error("Type visibility check failed", error as Error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
