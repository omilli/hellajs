import fs from "node:fs";
import path from "node:path";
import { logger, packagesDir, projectRoot } from "./utils/index.js";

/**
 * Guard (`bun lint:structure`): five structural checks over the docs surfaces.
 * Catches the classes of defect that shipped before it existed — an unclosed code
 * fence that mangled every block after it, Complete-Code drift between a tutorial
 * and the app it documents, broken `#`-anchors, pages unreachable from the nav,
 * and wrappers carrying content against the zero-content rule.
 *
 * 1. Fence parity — every `.mdx` under each package's `docs/`, every
 *    `examples/<name>/tutorial.mdx`, and every page under `docs/src/pages/` must
 *    have an even count of top-level fences (lines matching /^```/). An odd count
 *    means one fence never closed and every block after it renders as prose (or
 *    worse, prose renders as code).
 *
 * 2. Tutorial Complete-Code parity — for each `examples/<name>/tutorial.mdx` with
 *    a `## Complete Code` section: every `### \`src/...\`` block must byte-match
 *    the real file (trailing-newline-insensitive), and every real `src/` file must
 *    be documented (ambient shims like `vite-env.d.ts` are exempt).
 *
 * 3. Anchor resolution — every internal site link with a `#` fragment
 *    (`](/path#anchor)` or `href="/path#anchor"`) must resolve against the target
 *    page's heading-derived slug set (GitHub-style slugs, matching Astro's
 *    default). URL→file mapping mirrors `doc-links.ts`: `/<rel-path>` without
 *    extension; `index.mdx` serves its directory URL.
 *
 * 4. Wrapper validity — every site page under `docs/src/pages/` must carry frontmatter
 *    with `title`, `description`, and `layout`. Pages that import a package doc
 *    (the `@core/…`–`@examples/…` aliases) are import-rendering wrappers: their
 *    body may contain only imports, component tags, and optional
 *    `border-t` divider divs. Site-authored content pages (no package-doc
 *    import — quick-start, testing patterns) are exempt from the zero-content
 *    rule but not from the frontmatter rule.
 *
 * 5. Nav/index registration — every page in the `learn`, `reference`, and
 *    `plugins` sections (excluding `index.mdx` enumeration pages) must appear in
 *    `docs/src/nav.ts`
 *    (learn labels lowercase to slugs; reference slugs and plugin names verbatim),
 *    every nav entry must have a page (no dead entries), and every learn content
 *    page must also appear in its enumeration page (`learn/index.mdx` for
 *    concepts/tutorials, `learn/patterns/index.mdx` for patterns).
 *
 * No package scoping; scans every package, example, and site page.
 */

interface Finding {
  file: string;
  message: string;
}

const docsPagesDir = path.join(projectRoot, "docs", "src", "pages");
const examplesDir = path.join(projectRoot, "examples");
const navFile = path.join(projectRoot, "docs", "src", "nav.ts");

const FENCE_RE = /^```/;
const COMPLETE_CODE_RE = /^## Complete Code/;
const SRC_HEADING_RE = /^### `src\/(.+)`$/;
const SITE_LINK_RE = /\]\((\/[^)\s]+#([^)\s]+))\)/g;
const SITE_HREF_RE = /href="(\/[^"\s]+#([^"\s]+))"/g;
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*#*\s*$/;
const IMPORT_RE = /^import\s.+/;
const TAG_RE = /^<[A-Za-z][\w.]*\s*(?:\/>|>.*<\/[A-Za-z][\w.]*>)$/;
const DIVIDER_DIV_RE = /^<div class="[^"]*border-t[^"]*".*<\/div>$/;
const PACKAGE_DOC_IMPORT_RE =
  /^import\s.+from\s+["']@(core|css|dom|resource|router|store|ssr|examples)\/([^"']+)["']/;

/** Alias prefix → the directory it resolves to under the repo root. */
const ALIAS_DIRS: Record<string, string> = {
  core: "packages/core/docs",
  css: "packages/css/docs",
  dom: "packages/dom/docs",
  resource: "packages/resource/docs",
  router: "packages/router/docs",
  store: "packages/store/docs",
  ssr: "packages/ssr/docs",
  examples: "examples",
};

/**
 * Reads a file as UTF-8, returning `null` if unreadable. Keeps `main` to a single
 * top-level try/catch — per-file read failures are absorbed here.
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
 * `dist`. Same walker `doc-links.ts` uses.
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
 * Collects every `.mdx` the fence-parity check covers: package docs, example
 * tutorials, and site pages.
 * @returns Array of absolute file paths
 */
function collectMdxCorpus(): string[] {
  const files: string[] = [];
  for (const pkg of fs.readdirSync(packagesDir, { withFileTypes: true })) {
    if (!pkg.isDirectory()) continue;
    files.push(...collectFiles(path.join(packagesDir, pkg.name, "docs"), [".mdx"]));
  }
  for (const example of fs.readdirSync(examplesDir, { withFileTypes: true })) {
    if (!example.isDirectory()) continue;
    const tutorial = path.join(examplesDir, example.name, "tutorial.mdx");
    if (fs.existsSync(tutorial)) files.push(tutorial);
  }
  files.push(...collectFiles(docsPagesDir, [".mdx"]));
  return files;
}

/**
 * Derives the GitHub-style slug for a heading — lowercase, spaces to hyphens,
 * punctuation dropped — matching Astro's default `github-slugger` anchors.
 * @param heading The heading text (no leading `#`s)
 * @returns The anchor slug
 */
function headingSlug(heading: string): string {
  return heading
    .toLowerCase()
    .trim()
    .replace(/[^\w -]/g, "")
    .replace(/ /g, "-");
}

/**
 * Extracts the lines of one fenced block from mdx content.
 * @param lines The mdx lines
 * @param openIdx Index of the opening fence line
 * @returns The block's content lines, or null if the fence never closes
 */
function fenceBody(lines: string[], openIdx: number): string[] | null {
  for (let i = openIdx + 1; i < lines.length; i++) {
    if (FENCE_RE.test(lines[i]!)) return lines.slice(openIdx + 1, i);
  }
  return null;
}

/**
 * Check 1 — fence parity: every mdx has an even top-level fence count.
 * @param corpus Every mdx file in scope
 * @returns Findings (one per file with an odd count)
 */
function checkFenceParity(corpus: string[]): Finding[] {
  const findings: Finding[] = [];
  for (const file of corpus) {
    const content = readFileOrNull(file);
    if (content === null) continue;
    const count = content.split("\n").filter((l) => FENCE_RE.test(l)).length;
    if (count % 2 !== 0) {
      findings.push({ file, message: `odd fence count (${count}) — one fence never closes` });
    }
  }
  return findings;
}

/**
 * Check 2 — tutorial Complete-Code parity: each `### \`src/...\`` block byte-matches
 * the real file (rstrip compare; an optional leading `// src/...` breadcrumb is
 * stripped), and every real src file is documented.
 * @returns Findings
 */
function checkTutorialParity(): Finding[] {
  const findings: Finding[] = [];
  for (const example of fs.readdirSync(examplesDir, { withFileTypes: true })) {
    if (!example.isDirectory()) continue;
    const tutorialPath = path.join(examplesDir, example.name, "tutorial.mdx");
    const content = readFileOrNull(tutorialPath);
    if (content === null || !COMPLETE_CODE_RE.test(content)) continue;

    const lines = content.split("\n");
    const documented = new Map<string, string[]>();
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i]!.match(SRC_HEADING_RE);
      if (!m) continue;
      let j = i + 1;
      while (j < lines.length && !FENCE_RE.test(lines[j]!)) j++;
      const body = fenceBody(lines, j);
      if (body === null) {
        findings.push({ file: tutorialPath, message: `### src/${m[1]} — fence never closes` });
        continue;
      }
      const stripped = body.length > 0 && body[0]!.startsWith("// src/") ? body.slice(1) : body;
      documented.set(m[1]!, stripped);
      i = j + body.length + 1;
    }

    const srcRoot = path.join(examplesDir, example.name, "src");
    for (const real of collectFiles(srcRoot, [".ts", ".tsx", ".js", ".jsx", ".css", ".json"])) {
      const rel = path.relative(srcRoot, real);
      if (rel === "vite-env.d.ts") continue;
      const realLines = readFileOrNull(real)!.replace(/\n$/, "").split("\n").map((l) => l.replace(/\s+$/, ""));
      const block = documented.get(rel);
      if (block === undefined) {
        findings.push({ file: tutorialPath, message: `src/${rel} exists but has no Complete Code block` });
      } else if (JSON.stringify(block.map((l) => l.replace(/\s+$/, ""))) !== JSON.stringify(realLines)) {
        findings.push({ file: tutorialPath, message: `src/${rel} Complete Code block drifts from the real file` });
      }
    }
  }
  return findings;
}

/**
 * Maps a site URL path to its mdx file under docs/src/pages (index.mdx serves
 * its directory URL), mirroring doc-links' mapping.
 * @param urlPath The URL path (anchors/queries already stripped)
 * @returns The absolute file path, or null if no page matches
 */
function sitePageFile(urlPath: string): string | null {
  const candidates = [
    path.join(docsPagesDir, `${urlPath}.mdx`),
    path.join(docsPagesDir, urlPath, "index.mdx"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Check 3 — anchor resolution: every internal `#`-fragment link resolves against
 * the target page's heading slugs.
 * @returns Findings
 */
function checkAnchors(): Finding[] {
  const slugCache = new Map<string, Set<string>>();

  /**
   * Collects a page's heading-derived anchor slugs (cached per file).
   * @param file The absolute page path
   * @returns The set of valid anchors
   */
  function anchorsOf(file: string): Set<string> {
    const cached = slugCache.get(file);
    if (cached !== undefined) return cached;
    const slugs = new Set<string>();
    const content = readFileOrNull(file);
    if (content !== null) {
      let inFence = false;
      for (const line of content.split("\n")) {
        if (FENCE_RE.test(line)) {
          inFence = !inFence;
          continue;
        }
        if (inFence) continue;
        const imp = line.match(PACKAGE_DOC_IMPORT_RE);
        if (imp) {
          const target = path.join(projectRoot, ALIAS_DIRS[imp[1]!]!, imp[2]!);
          for (const slug of anchorsOf(target)) slugs.add(slug);
          continue;
        }
        const m = line.match(HEADING_RE);
        if (m) slugs.add(headingSlug(m[2]!));
      }
    }
    slugCache.set(file, slugs);
    return slugs;
  }

  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const file of collectMdxCorpus()) {
    const content = readFileOrNull(file);
    if (content === null) continue;
    for (const m of [...content.matchAll(SITE_LINK_RE), ...content.matchAll(SITE_HREF_RE)]) {
      const url = m[1]!;
      const anchor = m[2]!;
      const page = sitePageFile(url.split("#")[0]!.split("?")[0]!);
      if (page === null) continue; // page-existence is doc-links' job
      if (anchorsOf(page).has(anchor.toLowerCase())) continue;
      const message = `anchor #${anchor} in ${url} matches no heading on the target page`;
      const key = `${file}:${message}`;
      if (!seen.has(key)) {
        seen.add(key);
        findings.push({ file, message });
      }
    }
  }
  return findings;
}

/**
 * Parses a page's frontmatter block (leading `---` … `---`) into its raw lines.
 * @param content The page content
 * @returns The frontmatter body lines, or null if absent
 */
function frontmatterLines(content: string): string[] | null {
  if (!content.startsWith("---\n")) return null;
  const end = content.indexOf("\n---\n", 4);
  if (end === -1) return null;
  return content.slice(4, end).split("\n");
}

/**
 * Check 4 — wrapper validity: frontmatter completeness everywhere; import-rendering
 * wrappers carry no body content beyond imports, component tags, and border-t
 * divider divs. Site-authored pages (no package-doc import) skip the content rule.
 * @returns Findings
 */
function checkWrappers(): Finding[] {
  const findings: Finding[] = [];
  for (const file of collectFiles(docsPagesDir, [".mdx"])) {
    const content = readFileOrNull(file);
    if (content === null) continue;

    const fm = frontmatterLines(content);
    if (fm === null) {
      findings.push({ file, message: "no frontmatter block" });
      continue;
    }
    for (const key of ["title:", "description:", "layout:"]) {
      if (!fm.some((l) => l.trim().startsWith(key))) {
        findings.push({ file, message: `frontmatter missing ${key.replace(":", "")}` });
      }
    }

    const rel = path.relative(docsPagesDir, file).replace(/\.mdx$/, "");
    if (rel === "index" || rel.endsWith(`${path.sep}index`)) continue; // enumeration pages are sanctioned mixed content

    const body = content.slice(content.indexOf("\n---\n", 4) + 5);
    const isWrapper = body.split("\n").some((l) => PACKAGE_DOC_IMPORT_RE.test(l));
    if (!isWrapper) continue; // site-authored content page — frontmatter rules only

    for (const line of body.split("\n")) {
      const t = line.trim();
      if (t === "" || IMPORT_RE.test(t) || TAG_RE.test(t) || DIVIDER_DIV_RE.test(t)) continue;
      findings.push({ file, message: `wrapper carries content (zero-content rule): "${t.slice(0, 60)}"` });
    }
  }
  return findings;
}

/**
 * Check 5 — nav/index registration: pages ↔ nav.ts agree both ways; learn content
 * pages also appear in their enumeration page.
 * @returns Findings
 */
function checkRegistration(): Finding[] {
  const findings: Finding[] = [];
  const nav = readFileOrNull(navFile);
  if (nav === null) {
    findings.push({ file: navFile, message: "nav.ts unreadable" });
    return findings;
  }

  // Flatten nav entries, scoped per section: learn labels, reference slugs, plugin names.
  const referenceIdx = nav.indexOf("reference:");
  const pluginsIdx = nav.indexOf("plugins:");
  const learnSlice = nav.slice(0, referenceIdx === -1 ? undefined : referenceIdx);
  const learnSlugs = new Set<string>();
  for (const m of learnSlice.matchAll(/"([^"]+)"/g)) learnSlugs.add(m[1]!.toLowerCase());

  const pluginSlugs = new Set<string>();
  const referenceSlugs = new Map<string, Set<string>>();
  if (referenceIdx !== -1) {
    const refSlice = nav.slice(referenceIdx, pluginsIdx === -1 ? undefined : pluginsIdx);
    for (const pkg of refSlice.matchAll(/\{\s*(\w+):\s*\[([^\]]*)\]/g)) {
      const set = new Set<string>();
      // Drop { label, slug } objects from the array text first so only plain-string
      // entries match; their slug joins the set via its own capture.
      const plain = pkg[2]!.replace(/\{[^}]*\}/g, "");
      for (const slug of plain.matchAll(/"([^"]+)"/g)) set.add(slug[1]!.toLowerCase());
      for (const obj of pkg[2]!.matchAll(/slug:\s*"([^"]+)"/g)) set.add(obj[1]!.toLowerCase());
      referenceSlugs.set(pkg[1]!, set);
    }
  }
  if (pluginsIdx !== -1) {
    for (const slug of nav.slice(pluginsIdx).matchAll(/"([^"]+)"/g)) pluginSlugs.add(slug[1]!.toLowerCase());
  }

  const learnIndex = readFileOrNull(path.join(docsPagesDir, "learn", "index.mdx")) ?? "";
  const patternsIndex = readFileOrNull(path.join(docsPagesDir, "learn", "patterns", "index.mdx")) ?? "";

  const registered = { learn: new Set<string>(), reference: new Set<string>(), plugins: new Set<string>() };
  for (const file of collectFiles(docsPagesDir, [".mdx"])) {
    const rel = path.relative(docsPagesDir, file).replace(/\.mdx$/, "");
    if (rel === "index" || rel.endsWith("/index")) continue;
    const parts = rel.split(path.sep);
    const section = parts[0]!;
    const slug = parts[parts.length - 1]!; // nav registers leaf slugs

    if (section === "learn") {
      registered.learn.add(rel);
      if (!learnSlugs.has(slug)) {
        findings.push({ file, message: `page not registered in nav.ts (${rel})` });
      }
      const enumeration = rel.startsWith("learn/patterns/") ? patternsIndex : rel === "learn/quick-start" ? "" : learnIndex;
      const url = `/${rel.split(path.sep).join("/")}`;
      if (enumeration && !enumeration.includes(`(${url})`) && !enumeration.includes(`href="${url}"`)) {
        findings.push({ file, message: `page not listed in its enumeration page (${rel.startsWith("learn/patterns/") ? "learn/patterns/index.mdx" : "learn/index.mdx"})` });
      }
    } else if (section === "reference") {
      registered.reference.add(rel);
      const pkg = parts[1]!;
      const entry = referenceSlugs.get(pkg);
      if (entry === undefined || !entry.has(slug)) {
        findings.push({ file, message: `page not registered in nav.ts (${rel})` });
      }
    } else if (section === "plugins") {
      registered.plugins.add(rel);
      if (!pluginSlugs.has(slug)) {
        findings.push({ file, message: `page not registered in nav.ts (${rel})` });
      }
    }
  }

  // Reverse direction: a nav entry with no page is a dead sidebar link.
  for (const slug of learnSlugs) {
    if (["concepts", "patterns", "tutorials"].includes(slug)) continue; // group keys, not pages
    const candidates = [`learn/concepts/${slug}`, `learn/patterns/${slug}`, `learn/tutorials/${slug}`, `learn/${slug}`];
    if (!candidates.some((c) => registered.learn.has(c))) {
      findings.push({ file: navFile, message: `nav.ts learn entry "${slug}" matches no page` });
    }
  }
  for (const [pkg, slugs] of referenceSlugs) {
    for (const slug of slugs) {
      if (!registered.reference.has(`reference/${pkg}/${slug}`)) {
        findings.push({ file: navFile, message: `nav.ts reference entry ${pkg}/${slug} matches no page` });
      }
    }
  }
  for (const slug of pluginSlugs) {
    if (!registered.plugins.has(`plugins/${slug}`)) {
      findings.push({ file: navFile, message: `nav.ts plugins entry "${slug}" matches no page` });
    }
  }
  return findings;
}

async function main(): Promise<void> {
  try {
    const corpus = collectMdxCorpus();
    const findings = [
      ...checkFenceParity(corpus),
      ...checkTutorialParity(),
      ...checkAnchors(),
      ...checkWrappers(),
      ...checkRegistration(),
    ];

    for (const f of findings) {
      logger.info(`${path.relative(projectRoot, f.file)} — ${f.message}`);
    }

    if (findings.length === 0) {
      logger.success(`Docs structure clean (${corpus.length} mdx files, 5 checks)`);
      process.exit(0);
    }
    logger.error(`${findings.length} structure finding(s)`);
    process.exit(1);
  } catch (error) {
    logger.error("Structure check failed", error as Error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
