// Type visibility audit.
//
// Visibility is enforced by file location, not annotation (see guides/code.md
// "Types"). The file(s) a package's index.ts reaches via `export type *` hold
// only public types; internal types belong in lib/internal/. `@internal` on a
// hand-written .d.ts is decorative — TypeScript only strips `@internal` when
// emitting .d.ts from .ts, which does not apply here — so an `@internal`-tagged
// type sitting in a wholesale-exported file is a real leak.
//
// This script follows each `export type *` target in every packages/*/lib/index.ts
// and reports any exported type/interface carrying an `@internal` JSDoc tag.
//
// Run from the repo root:  bun .agents/skills/audit/scripts/check-type-visibility.mjs
// Exits 0 when clean, 1 when any leak is found.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../");
const PACKAGES = join(ROOT, "packages");

const TYPE_STAR_RE = /export\s+type\s+\*\s+from\s+["']([^"']+)["']/g;
const DECL_RE = /^\s*export\s+(?:declare\s+)?(type|interface)\s+(\w+)/;

function read(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

// Resolve an `export type *` import path to one or more files.
// `./types`         -> ./types.d.ts (file)            [core/css/router/store]
// `./types/nodes`    -> ./types/nodes.d.ts (file)      [dom/resource]
// A directory target scans its .d.ts/.ts entries (defensive; not used today).
function resolveTarget(baseDir, target) {
  for (const ext of [".d.ts", ".ts"]) {
    const p = join(baseDir, target + ext);
    if (existsSync(p) && statSync(p).isFile()) return [p];
  }
  const asDir = join(baseDir, target);
  if (existsSync(asDir) && statSync(asDir).isDirectory()) {
    return readdirSync(asDir)
      .filter((f) => f.endsWith(".d.ts") || f.endsWith(".ts"))
      .map((f) => join(asDir, f));
  }
  return [];
}

// Find exported type/interface declarations whose preceding JSDoc block carries @internal.
function findInternalLeaks(file) {
  const src = read(file);
  if (src == null) return [];
  const lines = src.split("\n");
  const leaks = [];
  let i = 0;
  const len = lines.length;
  while (i < len) {
    if (!lines[i].includes("/**")) {
      i++;
      continue;
    }
    // Gather the JSDoc block.
    let block = "";
    while (i < len) {
      block += lines[i] + "\n";
      if (lines[i].includes("*/")) {
        i++;
        break;
      }
      i++;
    }
    if (!/@internal\b/.test(block)) continue;
    // The declaration is the next non-empty line.
    while (i < len && lines[i].trim() === "") i++;
    if (i >= len) break;
    const m = lines[i].match(DECL_RE);
    if (m) {
      leaks.push({ name: m[2], kind: m[1], line: i + 1 });
    }
  }
  return leaks;
}

function pkgName(pkgDir) {
  const pj = read(join(pkgDir, "package.json"));
  if (pj) {
    try {
      return JSON.parse(pj).name;
    } catch {}
  }
  return null;
}

const entries = readdirSync(PACKAGES).filter((d) =>
  statSync(join(PACKAGES, d)).isDirectory(),
);

let totalLeaks = 0;
const rows = [];

for (const pkg of entries) {
  const indexFile = join(PACKAGES, pkg, "lib", "index.ts");
  const idxSrc = read(indexFile);
  if (!idxSrc) continue;
  const name = pkgName(join(PACKAGES, pkg)) ?? pkg;
  const baseDir = dirname(indexFile);
  const targets = new Set();
  TYPE_STAR_RE.lastIndex = 0;
  let m;
  while ((m = TYPE_STAR_RE.exec(idxSrc)) !== null) {
    for (const t of resolveTarget(baseDir, m[1])) targets.add(t);
  }
  for (const target of targets) {
    const leaks = findInternalLeaks(target);
    totalLeaks += leaks.length;
    const rel = target.replace(ROOT + "/", "");
    rows.push({ name, rel, leaks });
  }
}

let out = "Type visibility audit\n\n";
for (const r of rows) {
  const status =
    r.leaks.length === 0
      ? "clean"
      : `${r.leaks.length} leak${r.leaks.length > 1 ? "s" : ""}`;
  out += `${r.name.padEnd(20)} ${r.rel.padEnd(34)} ${status}\n`;
  for (const l of r.leaks) {
    out += `  - ${l.name} (${l.kind}, ${r.rel}:${l.line})\n`;
  }
}
const leakedFiles = rows.filter((r) => r.leaks.length).length;
out += `\n${totalLeaks} leak${totalLeaks === 1 ? "" : "s"} across ${leakedFiles} file(s).\n`;
process.stdout.write(out);
process.exit(totalLeaks === 0 ? 0 : 1);
