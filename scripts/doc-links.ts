import fs from "node:fs";
import path from "node:path";
import { logger, packagesDir, pluginsDir, projectRoot } from "./utils/index.js";

/**
 * Guard (`bun doc-links`): two checks over every docs surface.
 *
 * 1. Export-name check — fail if a doc link's display name (the `` `NAME` `` in
 * `` [`NAME`](URL) ``) is not a barrel export of the package the link targets. Catches
 * the `streamSsr` vs `ssr` rename drift that `tsc`, `eslint`, and every other
 * guard miss: a stale display name compiles, lints, and ships while pointing readers
 * at a symbol that no longer exists. The barrel (`packages/<pkg>/lib/index.ts`) is the
 * truth for the public surface; a symbol exported only from a non-barrel file is not
 * public and must not satisfy a doc link.
 *
 * 2. Page-existence check — fail if an internal site URL (any markdown link or `href`
 * under `/learn`, `/reference`, `/plugins`) resolves to no `.mdx` page under
 * `docs/src/pages/`. Catches link rot the export-name check cannot see: renamed or
 * deleted pages (`/learn/patterns/data` after the file became `resource.mdx`),
 * wrong slugs (`css-vars` vs `cssvars`, `ForEach` vs `foreach`), dropped wrappers
 * (`/reference/ssr` with no `docs/src/pages/reference/ssr/index.mdx`), and enumeration
 * drift on the hand-maintained index pages. `index.mdx` maps to its directory URL
 * (`/learn` ← `learn/index.mdx`); `#`-anchors and `?`-queries are stripped before
 * resolution.
 *
 * Scanned surfaces: every package's `docs/` (`.mdx`) and `lib/` (`.ts`), every plugin's
 * `src/` (`.ts`/`.mjs`), every website page under `docs/src/pages/`, and every
 * example tutorial (the `tutorial.mdx` inside each `examples/<name>/`).
 *
 * Out of scope for the export-name check (conservative skips, not failures — mirrors
 * `jsdoc-params.ts`'s skip philosophy): non-identifier display names (`<Suspense>`,
 * `props.children`, `mount()`, `error:fallback`), non-reference / relative / external
 * URLs, package-root links (`/reference/<pkg>` with no slug — the display name may be a
 * concept), unknown packages, and `#`-anchor member links whose fragment names the
 * display name itself
 * (`[`invalidateByPattern`](/reference/resource/resourcecache#invalidatebypattern)` — a
 * method on `resourceCache`, not a barrel symbol). Exported names are always checked;
 * only non-exported display names that point at a same-named anchor are skipped.
 */

interface Link {
  name: string;
  url: string;
}

interface Violation {
  pkg: string;
  file: string;
  name: string;
  url: string;
}

interface MissingPage {
  file: string;
  url: string;
}

const docsPagesDir = path.join(projectRoot, "docs", "src", "pages");

const barrelCache = new Map<string, Set<string>>();

/**
 * Reads a file as UTF-8, returning `null` if it cannot be read (missing or
 * unreadable). Keeps `main` to a single top-level try/catch — per-file read
 * failures are absorbed here, not scattered as try/catches across the walk.
 * @param filePath Absolute path to the file
 * @returns The file contents, or `null` if unreadable
 */
function readFileOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }
}

/**
 * Recursively collects files under a directory, skipping `node_modules` and
 * `dist`. Same walker `dead-exports.ts` / `jsdoc-params.ts` use.
 * @param dir The directory to walk
 * @param exts Only collect files with one of these extensions
 * @returns Array of absolute file paths
 */
function collectFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];

  function walk(current: string): void {
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
      } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
        results.push(fullPath);
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Collects the files scanned for doc links: every `.mdx` under each package's
 * `docs/`, every `.ts` (including `.d.ts`) under each package's `lib/`, every
 * `.ts` / `.mjs` under each plugin's `src/`, every website page under
 * `docs/src/pages/`, and every example tutorial (the `tutorial.mdx` inside each
 * `examples/<name>/`). `dist` and `node_modules` are skipped.
 * @returns Array of absolute file paths to scan
 */
function collectScanFiles(): string[] {
  const results: string[] = [];

  const pkgEntries = fs.readdirSync(packagesDir, { withFileTypes: true });
  for (const entry of pkgEntries) {
    if (!entry.isDirectory()) continue;
    const pkgDir = path.join(packagesDir, entry.name);
    const docsDir = path.join(pkgDir, "docs");
    if (fs.existsSync(docsDir)) results.push(...collectFiles(docsDir, [".mdx"]));
    const libDir = path.join(pkgDir, "lib");
    if (fs.existsSync(libDir)) results.push(...collectFiles(libDir, [".ts"]));
  }

  const pluginEntries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  for (const entry of pluginEntries) {
    if (!entry.isDirectory()) continue;
    const srcDir = path.join(pluginsDir, entry.name, "src");
    if (fs.existsSync(srcDir)) results.push(...collectFiles(srcDir, [".ts", ".mjs"]));
  }

  if (fs.existsSync(docsPagesDir)) results.push(...collectFiles(docsPagesDir, [".mdx"]));

  const examplesDir = path.join(projectRoot, "examples");
  if (fs.existsSync(examplesDir)) {
    for (const entry of fs.readdirSync(examplesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const tutorial = path.join(examplesDir, entry.name, "tutorial.mdx");
      if (fs.existsSync(tutorial)) results.push(tutorial);
    }
  }

  return results;
}

/**
 * Returns the set of names a package barrel-exports from `lib/index.ts`:
 * value names (`export { N }`, `export { N as A }` — uses the original local name,
 * `export (async )?(function|const|let|class) N`, `export type { N }`), type names
 * declared inline (`export type N`, `export interface N`), and every `type`/`interface`
 * in a `.d.ts` reached via `export type * from "./…"` (so a doc link to a type name
 * does not false-positive). Memoized per package.
 * @param pkg Package directory name under `packages/`
 * @returns Set of barrel-exported names (value + type)
 */
function collectBarrelExports(pkg: string): Set<string> {
  const cached = barrelCache.get(pkg);
  if (cached) return cached;

  const names = new Set<string>();
  const index = path.join(packagesDir, pkg, "lib", "index.ts");
  const content = readFileOrNull(index);
  if (content === null) {
    barrelCache.set(pkg, names);
    return names;
  }

  // export { A, B as C }  and  export { A } from "./x"  — use the original local name.
  for (const block of content.matchAll(/export\s*\{([^}]*)\}/g)) {
    for (const item of block[1]!.split(",")) {
      const trimmed = item.trim();
      if (!trimmed) continue;
      const asMatch = /^([A-Za-z_$][\w$]*)\s+as\s+/.exec(trimmed);
      const idMatch = /^([A-Za-z_$][\w$]*)/.exec(trimmed);
      const name = asMatch?.[1] ?? idMatch?.[1];
      if (name) names.add(name);
    }
  }

  // export (async )?(function|const|let|class) NAME
  for (const m of content.matchAll(/export\s+(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]!);
  }

  // export type NAME  /  export interface NAME  (inline type declarations in the barrel)
  for (const m of content.matchAll(/export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(m[1]!);
  }

  // export type { NAME } [from "…"]
  for (const m of content.matchAll(/export\s+type\s*\{([^}]*)\}/g)) {
    for (const item of m[1]!.split(",")) {
      const idMatch = /^([A-Za-z_$][\w$]*)/.exec(item.trim());
      if (idMatch) names.add(idMatch[1]!);
    }
  }

  // export type * from "./types…" — resolve the target .d.ts and add its type/interface names.
  for (const m of content.matchAll(/export\s+type\s+\*\s*from\s*["']([^"']+)["']/g)) {
    const base = path.join(packagesDir, pkg, "lib", m[1]!);
    const candidates = [`${base}.d.ts`, path.join(base, "index.d.ts")];
    const dts = candidates.find((c) => fs.existsSync(c));
    if (!dts) continue;
    const dtsContent = readFileOrNull(dts);
    if (dtsContent === null) continue;
    for (const t of dtsContent.matchAll(/export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/g)) {
      names.add(t[1]!);
    }
  }

  barrelCache.set(pkg, names);
  return names;
}

/**
 * Extracts markdown links of the form `` [`NAME`](URL) `` from source text.
 * @param content The text to scan
 * @returns Each captured `{ name, url }` pair
 */
function extractLinks(content: string): Link[] {
  const links: Link[] = [];
  for (const m of content.matchAll(/\[`([^`]+)`\]\(([^)]+)\)/g)) {
    links.push({ name: m[1]!, url: m[2]! });
  }
  return links;
}

/**
 * Captures the target package name from a doc-link URL. Recognizes
 * `/reference/<pkg>[/<slug>]` and `/@hellajs/<pkg>`; returns `null` for any
 * other form (relative, external, `/learn/…`).
 * @param url The link target
 * @returns Package name, or `null` if the URL is not a reference link
 */
function parsePackage(url: string): string | null {
  let m = /^\/reference\/([A-Za-z0-9_-]+)/.exec(url);
  if (m) return m[1]!;
  m = /^\/@hellajs\/([A-Za-z0-9_-]+)/.exec(url);
  if (m) return m[1]!;
  return null;
}

/**
 * Whether a reference URL is a package-root page (`/reference/<pkg>` with no
 * slug). The display name on a package-root link may be a concept, not an
 * export, so these are skipped.
 * @param url The link target
 * @param pkg The package captured from the URL
 * @returns True if the URL is the package root (no slug segment)
 */
function isPackageRootLink(url: string, pkg: string): boolean {
  const pathPart = url.split("#")[0]!.split("?")[0]!;
  return pathPart === `/reference/${pkg}`;
}

/**
 * Whether a non-exported display name points at a `#`-anchor that names itself
 * (e.g. `[`invalidateByPattern`](…#invalidatebypattern)`). Such a link references
 * a member / section of the target page (a method, property, or heading), not a
 * barrel symbol, so it is skipped. The fragment is the display name lowercased —
 * the slug form used by the docs site for camelCase identifiers.
 * @param url The link target
 * @param name The display name (already known not to be a barrel export)
 * @returns True if the URL's `#`-fragment equals the lowercased display name
 */
function isMemberAnchor(url: string, name: string): boolean {
  const hashIdx = url.indexOf("#");
  if (hashIdx === -1) return false;
  return url.slice(hashIdx + 1) === name.toLowerCase();
}

/**
 * Strips `#`-anchors and `?`-queries from a URL, leaving the page path.
 * @param url The raw link target
 * @returns The path portion of the URL
 */
function urlPath(url: string): string {
  return url.split("#")[0]!.split("?")[0]!;
}

/**
 * Whether a URL is an internal docs-site URL (under `/learn`, `/reference`, or
 * `/plugins`). Relative paths, external URLs, and other roots (`/@hellajs/…`
 * JSDoc links) are not site pages.
 * @param url The link target
 * @returns True if the URL targets the docs site
 */
function isSiteUrl(url: string): boolean {
  return /^\/(?:learn|reference|plugins)(?:\/|$)/.test(urlPath(url));
}

/**
 * Extracts every internal site URL from source text — both markdown links
 * (`](/path)`, any display form) and `href="/path"` attributes (the index-page
 * cards link via `href`, not markdown). Anchors and queries are kept as-is;
 * `sitePageExists` strips them.
 * @param content The text to scan
 * @returns Each site URL found, in order
 */
function extractSiteUrls(content: string): string[] {
  const urls: string[] = [];
  for (const m of content.matchAll(/\]\((\/[^)\s]+)\)/g)) {
    urls.push(m[1]!);
  }
  for (const m of content.matchAll(/href="(\/[^"\s]+)"/g)) {
    urls.push(m[1]!);
  }
  return urls.filter(isSiteUrl);
}

/**
 * Builds the set of URLs the docs site serves, from every `.mdx` under
 * `docs/src/pages/`. Each page serves `/<rel-path-without-extension>`; an
 * `index.mdx` additionally serves its directory URL (`learn/index.mdx` →
 * `/learn` as well as `/learn/index`).
 * @returns Set of servable site URLs
 */
function buildSitePages(): Set<string> {
  const pages = new Set<string>();
  for (const file of collectFiles(docsPagesDir, [".mdx"])) {
    const rel = path.relative(docsPagesDir, file).replace(/\.mdx$/, "");
    pages.add(`/${rel}`);
    if (rel === "index" || rel.endsWith("/index")) {
      pages.add(`/${rel.slice(0, -"index".length).replace(/\/+$/, "")}`);
    }
  }
  return pages;
}

async function main(): Promise<void> {
  try {
    const packageDirs = new Set(
      fs.readdirSync(packagesDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name),
    );

    const files = collectScanFiles();
    const sitePages = buildSitePages();
    const violations: Violation[] = [];
    const missing: MissingPage[] = [];

    for (const filePath of files) {
      const content = readFileOrNull(filePath);
      if (content === null) continue;

      for (const { name, url } of extractLinks(content)) {
        if (!/^[A-Za-z_$][\w$]*$/.test(name)) continue;
        const pkg = parsePackage(url);
        if (!pkg || !packageDirs.has(pkg)) continue;
        if (isPackageRootLink(url, pkg)) continue;
        if (collectBarrelExports(pkg).has(name)) continue;
        if (isMemberAnchor(url, name)) continue;

        violations.push({ pkg, file: filePath, name, url });
      }

      for (const url of extractSiteUrls(content)) {
        if (!sitePages.has(urlPath(url))) {
          missing.push({ file: filePath, url });
        }
      }
    }

    for (const v of violations) {
      const relFile = path.relative(projectRoot, v.file);
      logger.info(`${v.pkg}:${relFile} — [\`${v.name}\`](${v.url}) is not exported by @hellajs/${v.pkg}`);
    }
    for (const m of missing) {
      const relFile = path.relative(projectRoot, m.file);
      logger.info(`${relFile} — ${m.url} matches no page under docs/src/pages`);
    }

    if (violations.length === 0 && missing.length === 0) {
      logger.success("No doc-link export mismatches or missing pages found");
      process.exit(0);
    }
    process.exit(1);
  } catch (error) {
    logger.error("Doc-links check failed", error as Error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
