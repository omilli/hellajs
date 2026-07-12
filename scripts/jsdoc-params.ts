import fs from "node:fs";
import path from "node:path";
import { logger, packagesDir, pluginsDir, projectRoot } from "./utils/index.js";

/**
 * Guard (`bun jsdoc-params`): fail if any `function` declaration's JSDoc carries
 * a `@param` tag whose name does not match an actual parameter. Catches the
 * `@param boundaryElement` vs `currentBoundary` / `@param element` vs `node`
 * drift that `tsc` and `eslint` do not (TS does not validate `@param` names
 * against signatures in `.ts` files). Mirrors the visibility/dead-exports guard
 * pattern: no package scoping, text-based, exit 1 on any violation.
 *
 * Out of scope (conservative skips, not failures): destructuring parameters
 * (`{ a, b }` / `[a, b]` — `@param` uses property paths this check does not
 * validate), arrow-function `const`s, class methods, and any signature whose
 * parameter list cannot be cleanly parsed by the text walker. A skipped
 * function is not flagged — the guard reports only clear name drift.
 */

interface Violation {
  pkg: string;
  file: string;
  fn: string;
  param: string;
}

/**
 * Collects declaration source files: every `.ts` under each package's `lib/`
 * and every `.ts` / `.mjs` under each plugin's `src/` (excluding `.d.ts`). Same
 * surface `dead-exports.ts` scans.
 * @returns Array of absolute file paths to scan
 */
function collectDeclFiles(): string[] {
  const results: string[] = [];

  function walk(dir: string, exts: string[]): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath, exts);
      } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  const pkgEntries = fs.readdirSync(packagesDir, { withFileTypes: true });
  for (const entry of pkgEntries) {
    if (!entry.isDirectory()) continue;
    const libDir = path.join(packagesDir, entry.name, "lib");
    if (fs.existsSync(libDir)) walk(libDir, [".ts"]);
  }

  const pluginEntries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of pluginEntries) {
    if (!entry.isDirectory()) continue;
    const srcDir = path.join(pluginsDir, entry.name, "src");
    if (fs.existsSync(srcDir)) walk(srcDir, [".ts", ".mjs"]);
  }

  return results.filter((f) => !f.endsWith(".d.ts"));
}

/**
 * Determines the package or plugin name from an absolute file path.
 * @param filePath Absolute path
 * @returns Package/plugin name (e.g. "dom", "babel") or an empty string
 */
function getPackageName(filePath: string): string {
  const parts = filePath.split(path.sep);
  const pkgsIdx = parts.indexOf("packages");
  if (pkgsIdx !== -1 && parts.length > pkgsIdx + 1) return parts[pkgsIdx + 1]!;
  const pluginsIdx = parts.indexOf("plugins");
  if (pluginsIdx !== -1 && parts.length > pluginsIdx + 1) return parts[pluginsIdx + 1]!;
  return "";
}

/**
 * Returns the JSDoc block (`/** … *\/`) immediately and contiguously preceding
 * the given 0-indexed line, or null if none. A blank line or non-JSDoc line
 * between the block and the declaration means no association.
 * @param lines Source lines
 * @param lineIdx 0-indexed declaration line
 * @returns The raw JSDoc block, or null
 */
function precedingJsdoc(lines: string[], lineIdx: number): string | null {
  let j = lineIdx - 1;
  if (j < 0) return null;
  if (!lines[j]!.trimEnd().endsWith("*/")) return null;

  const block: string[] = [];
  while (j >= 0) {
    block.unshift(lines[j]!);
    if (lines[j]!.trimStart().startsWith("/**")) return block.join("\n");
    j--;
  }
  return null;
}

/**
 * Extracts `@param` tag names from a JSDoc block. Strips optional `{Type}`
 * annotations, optional-value brackets (`[name]` / `[name=default]`), and
 * skips destructuring property paths (`name.prop`).
 * @param jsdoc Raw JSDoc block text
 * @returns Array of parameter names documented by `@param` tags
 */
function paramTagNames(jsdoc: string): string[] {
  const tags: string[] = [];
  const re = /@param\s+(?:\{[^}]*\}\s+)?(\[[^\]]+\]|[A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(jsdoc)) !== null) {
    let name = match[1]!;
    if (name.startsWith("[")) {
      name = name.slice(1);
      const eq = name.indexOf("=");
      if (eq > -1) name = name.slice(0, eq);
      name = name.replace(/\]$/, "");
    }
    if (name.includes(".")) continue;
    tags.push(name);
  }
  return tags;
}

interface ParsedParams {
  names: string[];
  ambiguous: boolean;
}

/**
 * Walks a parameter-list string split by top-level commas (depth-aware over
 * `() [] {}` — generics `<>` are deliberately not tracked so `=>` arrow types
 * do not corrupt depth) and returns each parameter's name. Returns
 * `ambiguous: true` if any segment is a destructuring pattern or has no
 * leading identifier — the caller skips the function rather than risk a false
 * positive.
 * @param inner The text between the signature's outer parentheses
 * @returns Parsed parameter names + an ambiguity flag
 */
function parseParamNames(inner: string): ParsedParams {
  const trimmed = inner.trim();
  if (trimmed === "") return { names: [], ambiguous: false };

  const segments: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of trimmed) {
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") depth--;
    if (ch === "," && depth === 0) {
      segments.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  segments.push(current);

  const names: string[] = [];
  const modifiers = new Set(["readonly", "public", "private", "protected", "static"]);
  for (const segment of segments) {
    let seg = segment.trim();
    if (seg.startsWith("...")) seg = seg.slice(3).trimStart();
    // first identifier token, skipping leading TS modifiers
    const ident = /^[A-Za-z_$][\w$]*/.exec(seg);
    if (!ident) return { names: [], ambiguous: true }; // destructuring or unparsable
    if (modifiers.has(ident[0]!)) {
      const rest = seg.slice(ident[0]!.length).trimStart();
      const next = /^[A-Za-z_$][\w$]*/.exec(rest);
      if (!next) return { names: [], ambiguous: true };
      names.push(next[0]!);
    } else {
      names.push(ident[0]!);
    }
  }
  return { names, ambiguous: false };
}

/**
 * Extracts the parameter names of a `function name(…)` declaration by
 * paren-depth walking from the first `(` at or after the given char offset.
 * @param content Full file content
 * @param startChar Char offset to begin searching for the opening paren
 * @returns Parsed parameter names + an ambiguity flag
 */
function extractParamNames(content: string, startChar: number): ParsedParams {
  const openParen = content.indexOf("(", startChar);
  if (openParen === -1) return { names: [], ambiguous: true };

  let depth = 0;
  let end = -1;
  for (let i = openParen; i < content.length; i++) {
    const ch = content[i]!;
    if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return { names: [], ambiguous: true };

  return parseParamNames(content.slice(openParen + 1, end));
}

async function main(): Promise<void> {
  try {
    const files = collectDeclFiles();
    const violations: Violation[] = [];

    // `function name(` on one line; matches exported, async, and local declarations.
    const fnRe = /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/;

    for (const filePath of files) {
      let content: string;
      try {
        content = fs.readFileSync(filePath, "utf-8");
      } catch {
        continue;
      }

      const lines = content.split("\n");

      // Precompute the char offset where each line begins.
      const lineOffsets: number[] = new Array(lines.length);
      let offset = 0;
      for (let i = 0; i < lines.length; i++) {
        lineOffsets[i] = offset;
        offset += lines[i]!.length + 1; // +1 for the "\n"
      }

      for (let i = 0; i < lines.length; i++) {
        const match = fnRe.exec(lines[i]!);
        if (!match) continue;

        const fnName = match[1]!;
        const jsdoc = precedingJsdoc(lines, i);
        if (!jsdoc) continue;

        const tags = paramTagNames(jsdoc);
        if (tags.length === 0) continue;

        const declChar = lineOffsets[i]! + match.index!;
        const { names, ambiguous } = extractParamNames(content, declChar);
        if (ambiguous) continue; // conservative skip

        for (const tag of tags) {
          if (!names.includes(tag)) {
            violations.push({ pkg: getPackageName(filePath), file: filePath, fn: fnName, param: tag });
          }
        }
      }
    }

    if (violations.length === 0) {
      logger.success("No @param name mismatches found");
      process.exit(0);
    }

    for (const v of violations) {
      const relFile = path.relative(projectRoot, v.file);
      logger.info(`${v.pkg}:${relFile}:${v.fn} — @param ${v.param} does not match any parameter`);
    }
    process.exit(1);
  } catch (error) {
    logger.error("JSDoc @param check failed", error as Error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
