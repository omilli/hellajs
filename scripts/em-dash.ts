import fs from "node:fs";
import path from "node:path";
import { logger, packagesDir, pluginsDir, changesetDir, projectRoot } from "./utils/index.js";

/** Ban set: em dash (U+2014), en dash (U+2013), and their HTML entities. Case-insensitive. */
const DASH_PATTERN = /—|–|&mdash;|&ndash;|&#8212;|&#8213;|&#x2014;|&#x2013;/i;

interface Violation {
  file: string;
  line: number;
}

/**
 * Collects every `.mdx` file under a directory, recursively, skipping
 * `node_modules` and `dist`.
 * @param dir Directory to walk
 * @returns Array of absolute `.mdx` file paths
 */
function collectMdxFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return results;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdxFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".mdx")) {
      results.push(fullPath);
    }
  }
  return results;
}

/**
 * Collects the user-facing files the ban applies to (allowlist-include, so
 * agent-only files never trip the guard): root + site READMEs, every `.mdx`
 * under each package's `docs/`, each package's `README.md`, `CHANGELOG.md`,
 * and `{pkg}-comparison.md`, every plugin's `README.md`, every example's
 * `tutorial.mdx`, the site's pages under `docs/src/pages`, and `.changeset/*.md`.
 * @returns Array of absolute file paths to scan
 */
function collectScanFiles(): string[] {
  const results: string[] = [];

  /**
   * Pushes a file onto the results if it exists.
   * @param filePath Absolute path to a candidate file
   */
  const pushIfExists = (filePath: string): void => {
    if (fs.existsSync(filePath)) results.push(filePath);
  };

  pushIfExists(path.join(projectRoot, "README.md"));
  pushIfExists(path.join(projectRoot, "docs", "README.md"));

  for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pkgDir = path.join(packagesDir, entry.name);
    results.push(...collectMdxFiles(path.join(pkgDir, "docs")));
    pushIfExists(path.join(pkgDir, "README.md"));
    pushIfExists(path.join(pkgDir, "CHANGELOG.md"));
    pushIfExists(path.join(pkgDir, `${entry.name}-comparison.md`));
  }

  for (const entry of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    pushIfExists(path.join(pluginsDir, entry.name, "README.md"));
  }

  const examplesDir = path.join(projectRoot, "examples");
  if (fs.existsSync(examplesDir)) {
    for (const entry of fs.readdirSync(examplesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      pushIfExists(path.join(examplesDir, entry.name, "tutorial.mdx"));
    }
  }

  results.push(...collectMdxFiles(path.join(projectRoot, "docs", "src", "pages")));

  if (fs.existsSync(changesetDir)) {
    for (const name of fs.readdirSync(changesetDir)) {
      if (name.endsWith(".md")) results.push(path.join(changesetDir, name));
    }
  }

  return results;
}

/**
 * Scans one file line-by-line for the ban pattern, fences included
 * (tutorial code comments are user-visible).
 * @param filePath Absolute path to the file to scan
 * @returns Violations as repo-relative path + 1-indexed line number
 */
function scanFile(filePath: string): Violation[] {
  const rel = path.relative(projectRoot, filePath);
  const hits: Violation[] = [];
  const lines = fs.readFileSync(filePath, "utf-8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (DASH_PATTERN.test(lines[i]!)) hits.push({ file: rel, line: i + 1 });
  }
  return hits;
}

async function main(): Promise<void> {
  try {
    const files = collectScanFiles();
    const violations: Violation[] = [];
    for (const file of files) {
      violations.push(...scanFile(file));
    }

    if (violations.length === 0) {
      logger.success(`No em/en dashes in user-facing docs (${files.length} files scanned)`);
      process.exit(0);
    }

    logger.info(`Em/en dash ban violated on ${violations.length} line(s):`);
    for (const v of violations) {
      logger.info(`${v.file}:${v.line}`);
    }
    process.exit(1);
  } catch (error) {
    logger.error("Em-dash guard failed", error as Error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
