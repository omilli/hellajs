import type { UiStyle } from "../types";

const SECTION_REGEX = /^\s*\/\/\s*@hella:(styles|compose)\s*$/;
const END_REGEX = /^\s*\/\/\s*@hella:end\s*$/;
const MARKER_PREFIX_REGEX = /^\s*\/\/\s*@hella:/;
const IMPORT_REGEX = /^import\s/;
const EXPORT_DEFAULT_REGEX = /^export\s+(default|\{)/;
const EXPORT_PREFIX = "export ";
// Carries ".js" explicitly: the per-module build's specifier fixup appends
// ".js" to extensionless relative imports — string literals included — so the
// source constant must already hold the final form to stay identical across
// the per-module and flattened bundle builds.
const CN_IMPORT = 'import { cn } from "./cn.js";';
const REQUIRED_SECTIONS = ["styles", "compose"] as const;

/**
 * One marker-delimited region of a canonical file: the section name and the
 * body lines between its opener and `@hella:end` (markers excluded). Leading
 * whitespace on marker lines is tolerated.
 */
interface MarkerSection {
  name: string;
  body: string[];
}

/**
 * A parsed source split into top-level lines and marker sections, preserving
 * the original order so a transform can rebuild the file around the sections.
 */
type SourceBlock = { kind: "line"; text: string } | MarkerSection & { kind: "section" };

/**
 * Splits source text into ordered line and section blocks. Section openers
 * are `// @hella:styles` and `// @hella:compose`, closers are `// @hella:end`;
 * any other `@hella:` marker line is rejected so stale marker contracts fail
 * loudly instead of shipping as inert comments.
 * @param source File text to parse.
 * @returns Blocks in order of appearance.
 * @throws {Error} When a section opens inside another, an `@hella:end` has no
 * open section, the text ends inside a section, or an unknown marker appears.
 */
function parseBlocks(source: string): SourceBlock[] {
  const lines = source.split("\n");
  const blocks: SourceBlock[] = [];
  let current: MarkerSection | undefined;
  let i = 0;
  const len = lines.length;
  while (i < len) {
    const line = lines[i++]!;
    const opener = SECTION_REGEX.exec(line);
    if (opener !== null) {
      if (current !== undefined) {
        throw new Error(`[ui] applyStyleVariant: section "${current.name}" is still open when section "${opener[1]}" opens`);
      }
      current = { name: opener[1]!, body: [] };
      blocks.push({ kind: "section", name: opener[1]!, body: current.body });
      continue;
    }
    if (END_REGEX.test(line)) {
      if (current === undefined) {
        throw new Error("[ui] applyStyleVariant: @hella:end without an open section");
      }
      current = undefined;
      continue;
    }
    if (MARKER_PREFIX_REGEX.test(line)) {
      throw new Error(`[ui] applyStyleVariant: unknown marker "${line.trim()}"`);
    }
    if (current === undefined) blocks.push({ kind: "line", text: line });
    else current.body.push(line);
  }
  if (current !== undefined) {
    throw new Error(`[ui] applyStyleVariant: section "${current.name}" is never closed with @hella:end`);
  }
  return blocks;
}

/**
 * Extracts the quoted module specifier of a top-level import line.
 * @param line Import statement line.
 * @returns The specifier inside the last quoted segment.
 * @throws {Error} When the line carries no quoted specifier.
 */
function importSpecifier(line: string): string {
  const QUOTE_REGEX = /"([^"]*)"/g;
  let spec: string | undefined;
  let match: RegExpExecArray | null;
  while ((match = QUOTE_REGEX.exec(line)) !== null) spec = match[1];
  if (spec === undefined) {
    throw new Error(`[ui] applyStyleVariant: style module import has no specifier: "${line.trim()}"`);
  }
  return spec;
}

/**
 * Normalizes a style module's text into spliceable body lines: package import
 * lines ride along verbatim (relative and absolute specifiers are rejected —
 * spliced output lives in a foreign directory), and `export ` prefixes are
 * stripped so the declarations become file-local. Leading and trailing blank
 * lines are dropped; interior blank lines are kept.
 * @param text Style module file text.
 * @returns Body lines for the canonical's `@hella:styles` region.
 * @throws {Error} When an import uses a relative or absolute specifier or the
 * module exports through `export default` / `export { … }`.
 */
function parseStyleModule(text: string): string[] {
  const lines = text.split("\n");
  const body: string[] = [];
  let i = 0;
  const len = lines.length;
  while (i < len) {
    const line = lines[i++]!;
    if (IMPORT_REGEX.test(line)) {
      const spec = importSpecifier(line);
      if (spec.startsWith(".") || spec.startsWith("/")) {
        throw new Error(`[ui] applyStyleVariant: style module imports must use package specifiers, got "${spec}"`);
      }
      body.push(line);
      continue;
    }
    if (EXPORT_DEFAULT_REGEX.test(line)) {
      throw new Error(`[ui] applyStyleVariant: style module cannot use "${line.trim()}"`);
    }
    body.push(line.startsWith(EXPORT_PREFIX) ? line.slice(EXPORT_PREFIX.length) : line);
  }
  let start = 0;
  let end = body.length;
  while (start < end && body[start] === "") start++;
  while (end > start && body[end - 1] === "") end--;
  return body.slice(start, end);
}

/**
 * Wraps a compose region's plain class array in a `cn(…)` call for the
 * tailwind flavor: the array's opening `[` becomes `cn(` and the closing `]`
 * becomes `)`. Single-line and multi-line arrays both keep their interior
 * lines verbatim.
 * @param body Compose region body lines holding a class array.
 * @returns The wrapped body lines.
 * @throws {Error} When the body is blank or is not a plain array literal.
 */
function wrapComposeWithCn(body: string[]): string[] {
  const wrapped = body.slice();
  let first = -1;
  let last = -1;
  let i = 0;
  const len = wrapped.length;
  while (i < len) {
    if (wrapped[i] !== "") {
      if (first === -1) first = i;
      last = i;
    }
    i++;
  }
  if (first === -1) {
    throw new Error("[ui] applyStyleVariant: compose region is empty");
  }
  const open = wrapped[first]!.indexOf("[");
  if (open === -1) {
    throw new Error("[ui] applyStyleVariant: compose region must be a plain class array (no \"[\" found)");
  }
  const head = wrapped[first]!;
  wrapped[first] = `${head.slice(0, open)}cn(${head.slice(open + 1)}`;
  const close = wrapped[last]!.lastIndexOf("]");
  if (close === -1) {
    throw new Error("[ui] applyStyleVariant: compose region must be a plain class array (no \"]\" found)");
  }
  const tail = wrapped[last]!;
  wrapped[last] = `${tail.slice(0, close)})${tail.slice(close + 1)}`;
  return wrapped;
}

/**
 * Resolves a registry canonical's flavor: the style module's body (package
 * imports + declarations, `export ` prefixes stripped) is spliced into the
 * `@hella:styles` region, marker lines are removed, and every `@hella:compose`
 * region keeps its plain-array body for `css` while `tailwind` wraps each in
 * `cn(…)` and injects the shared `cn` import after the file's last import.
 * Multi-part components carry one compose region per styled part; `styles`
 * stays unique. Deterministic — the same inputs always produce the same text.
 * @param source Canonical file text with an `@hella:styles` region and one or more `@hella:compose` regions.
 * @param styleModuleText Style module text spliced into the styles region.
 * @param style Target registry style.
 * @returns The flavor's file text, marker lines always stripped.
 * @throws {Error} When the canonical has unbalanced, unknown, or missing marker regions, a duplicate `@hella:styles`, or the style module is not spliceable.
 */
export function applyStyleVariant(source: string, styleModuleText: string, style: UiStyle): string {
  const blocks = parseBlocks(source);
  const sections = new Map<string, string[]>();
  let i = 0;
  const len = blocks.length;
  while (i < len) {
    const block = blocks[i++]!;
    if (block.kind !== "section") continue;
    if (block.name === "styles") {
      if (sections.has(block.name)) {
        throw new Error(`[ui] applyStyleVariant: duplicate @hella:${block.name} region`);
      }
      sections.set(block.name, block.body);
    } else if (!sections.has(block.name)) {
      sections.set(block.name, block.body);
    }
  }
  let r = 0;
  const sectionsLen = REQUIRED_SECTIONS.length;
  while (r < sectionsLen) {
    const name = REQUIRED_SECTIONS[r++]!;
    if (!sections.has(name)) {
      throw new Error(`[ui] applyStyleVariant: canonical is missing its @hella:${name} region`);
    }
  }
  const moduleBody = parseStyleModule(styleModuleText);
  const out: string[] = [];
  let j = 0;
  const outLen = blocks.length;
  while (j < outLen) {
    const block = blocks[j++]!;
    if (block.kind === "line") {
      out.push(block.text);
      continue;
    }
    if (block.name === "styles") {
      let s = 0;
      const moduleLen = moduleBody.length;
      while (s < moduleLen) out.push(moduleBody[s++]!);
      continue;
    }
    const compose = style === "css" ? block.body : wrapComposeWithCn(block.body);
    let c = 0;
    const composeLen = compose.length;
    while (c < composeLen) out.push(compose[c++]!);
  }
  if (style === "tailwind") {
    let lastImport = -1;
    let k = out.length - 1;
    while (k >= 0 && lastImport === -1) {
      if (IMPORT_REGEX.test(out[k]!)) lastImport = k;
      k--;
    }
    out.splice(lastImport + 1, 0, CN_IMPORT);
  }
  return out.join("\n");
}
