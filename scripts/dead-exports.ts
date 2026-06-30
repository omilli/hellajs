import fs from "node:fs";
import path from "node:path";
import { logger, packagesDir, pluginsDir } from "./utils/index.js";

/**
 * Out of scope for v1: type-only exports (export type, export interface).
 * Dead-detection for type aliases/interfaces requires type-resolution,
 * not text analysis.
 */

const projectRoot = path.resolve(process.cwd());
const docsDir = path.join(projectRoot, "docs");
const searchBaseDirs = [packagesDir, pluginsDir, docsDir];

interface CandidateExport {
  name: string;
  pkg: string;
  file: string;
  lineNumber: number;
}

interface DeadExport {
  pkg: string;
  file: string;
  symbol: string;
}

/**
 * Recursively collects all files under a directory, skipping
 * node_modules and dist directories.
 * @param dir The directory to walk
 * @param exts Optional filter — only collect files with these extensions
 * @returns Array of absolute file paths
 */
function collectFiles(dir: string, exts?: string[]): string[] {
  const results: string[] = [];

  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        if (!exts) {
          results.push(fullPath);
        } else {
          const ext = path.extname(entry.name);
          if (exts.includes(ext)) {
            results.push(fullPath);
          }
        }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Collects declaration source files: lib source per package and
 * plugin source per plugin (not .d.ts).
 * @returns Array of absolute file paths to scan for exports
 */
function collectDeclFiles(): string[] {
  const results: string[] = [];

  // packages/*/lib/**&#47;*.ts
  const pkgEntries = fs.readdirSync(packagesDir, { withFileTypes: true });
  for (const entry of pkgEntries) {
    if (!entry.isDirectory()) continue;
    const libDir = path.join(packagesDir, entry.name, "lib");
    if (!fs.existsSync(libDir)) continue;
    results.push(...collectFiles(libDir, [".ts"]));
  }

  // plugins/*/src/**&#47;*.{ts,mjs}
  const pluginEntries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of pluginEntries) {
    if (!entry.isDirectory()) continue;
    const srcDir = path.join(pluginsDir, entry.name, "src");
    if (!fs.existsSync(srcDir)) continue;
    results.push(...collectFiles(srcDir, [".ts", ".mjs"]));
  }

  return results.filter((f) => !f.endsWith(".d.ts"));
}

/**
 * Scans a source file for export declarations matching
 * `export (async )?(function|const|let|class) NAME`.
 * Returns the first declaration per name (dedupes overloads).
 * @param filePath Absolute path to the file
 * @returns Map of export name to 1-indexed line number
 */
function findExportDeclarations(filePath: string): Map<string, number> {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const exports = new Map<string, number>();
  const regex = /^export\s+(?:async\s+)?(?:function|const|let|class)\s+(\w+)/;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]!.match(regex);
    if (match && !exports.has(match[1]!)) {
      exports.set(match[1]!, i + 1);
    }
  }

  return exports;
}

/**
 * Determines the package or plugin name from an absolute file path.
 * @param filePath Absolute path
 * @returns Package/plugin name (e.g. "dom", "babel") or an empty string
 */
function getPackageName(filePath: string): string {
  const parts = filePath.split(path.sep);
  const pkgsIdx = parts.indexOf("packages");
  if (pkgsIdx !== -1 && parts.length > pkgsIdx + 1) {
    return parts[pkgsIdx + 1]!;
  }
  const pluginsIdx = parts.indexOf("plugins");
  if (pluginsIdx !== -1 && parts.length > pluginsIdx + 1) {
    return parts[pluginsIdx + 1]!;
  }
  return "";
}

/**
 * Checks whether a line is a barrel / re-export line that references the
 * given name. Barrel lines are excluded from the "used" count because
 * they forward dead weight rather than consume it.
 * @param line The source line
 * @param name The symbol name
 * @returns True if the line is a re-export of name
 */
function isBarrelLine(line: string, name: string): boolean {
  const trimmed = line.trimStart();

  // export { … NAME … } or export { … NAME … } from "…"
  if (/^export\s*\{/.test(trimmed) && line.includes(name)) return true;

  // export type { … NAME … }
  if (/^export\s+type\s*\{/.test(trimmed) && line.includes(name)) return true;

  // export * from "…" (wholesale re-export — excludes any use of NAME in the path)
  if (/^export\s*\*\s*from/.test(trimmed) && line.includes(name)) return true;

  return false;
}

/**
 * Checks whether a line is an import statement that references the given
 * name. Import statements are excluded from the "used" count — an unused
 * import is a separate lint concern, not a "use".
 * @param line The source line
 * @param name The symbol name
 * @returns True if the line is an import of name
 */
function isImportLine(line: string, name: string): boolean {
  const trimmed = line.trimStart();
  if (!trimmed.startsWith("import")) return false;
  return line.includes(name);
}

/**
 * Escapes special regex characters in a string.
 * @param str Unescaped string
 * @returns Escaped string safe for use in a RegExp
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Counts value-position references of a symbol across all search files.
 * Excludes the declaration line, barrel / re-export lines, and import lines.
 * @param name The symbol name
 * @param searchFiles Array of file paths to search
 * @param declFile The file where the symbol is declared
 * @param declLine 1-indexed line number of the declaration
 * @returns Number of value-position references
 */
function countValueRefs(
  name: string,
  searchFiles: string[],
  declFile: string,
  declLine: number,
): number {
  const escaped = escapeRegex(name);
  const wordRe = new RegExp(`\\b${escaped}\\b`);
  let count = 0;

  for (const filePath of searchFiles) {
    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineNum = i + 1;

      if (!wordRe.test(line)) continue;

      // Exclude the declaration line itself
      if (filePath === declFile && lineNum === declLine) continue;

      // Exclude barrel / re-export lines
      if (isBarrelLine(line, name)) continue;

      // Exclude import statement lines
      if (isImportLine(line, name)) continue;

      count++;
    }
  }

  return count;
}

async function main(): Promise<void> {
  try {
    // Collect declaration files (lib source, plugin source)
    const declFiles = collectDeclFiles();

    // Collect search files for reference scanning
    const searchFiles: string[] = [];
    for (const baseDir of searchBaseDirs) {
      searchFiles.push(...collectFiles(baseDir));
    }

    // Enumerate candidate exports (deduped per file)
    const candidates: CandidateExport[] = [];

    for (const filePath of declFiles) {
      const exports = findExportDeclarations(filePath);
      if (exports.size === 0) continue;

      const pkg = getPackageName(filePath);

      for (const [name, lineNumber] of exports) {
        candidates.push({ name, pkg, file: filePath, lineNumber });
      }
    }

    // Classify each candidate
    const dead: DeadExport[] = [];

    for (const { name, pkg, file, lineNumber } of candidates) {
      const refCount = countValueRefs(name, searchFiles, file, lineNumber);

      if (refCount === 0) {
        dead.push({ pkg, file, symbol: name });
      }
    }

    // Report
    const cwd = projectRoot;

    if (dead.length === 0) {
      logger.success("No dead exports found");
      process.exit(0);
    }

    for (const { pkg, file, symbol } of dead) {
      const relFile = path.relative(cwd, file);
      logger.info(`${pkg}:${relFile}:${symbol} — exported but has zero references across repo source/tests/docs`);
    }
    process.exit(1);
  } catch (error) {
    logger.error("Dead exports check failed", error as Error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
