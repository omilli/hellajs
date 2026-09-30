import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { codeToHtml } from "shiki";

// Astro frontmatter runs server-side, so node builtins are fine here.
// Every astro command (dev, build) runs with cwd = docs/, so the cache
// anchors there; import.meta.url would point at the bundled SSR chunk
// instead of this source file. Content-hash keys make the cache
// self-invalidating: editing a source changes its hash and misses, so no
// mtime or git-status coupling needed.
const cacheFile = join(process.cwd(), ".cache/shiki.json");
const theme = "github-dark";

let cache: Record<string, string> | undefined;

function load(): Record<string, string> {
  if (cache === undefined) {
    try {
      cache = JSON.parse(readFileSync(cacheFile, "utf8")) as Record<string, string>;
    } catch {
      cache = {};
    }
  }
  return cache;
}

/**
 * Highlight `code` for the docs site with shiki, pinned to `github-dark`.
 * Repeat calls with the same `(code, lang)` are served from a JSON disk
 * cache at `docs/.cache/shiki.json` (loaded once per process, written
 * through on miss), so only the first render of a triple pays the
 * `codeToHtml` cost.
 */
export async function highlight(code: string, lang: string): Promise<string> {
  const key = createHash("sha256").update(`${theme}:${lang}:${code}`).digest("hex");
  const entries = load();
  const hit = entries[key];
  if (hit !== undefined) return hit;
  const html = await codeToHtml(code, { lang, theme });
  entries[key] = html;
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(entries));
  return html;
}
