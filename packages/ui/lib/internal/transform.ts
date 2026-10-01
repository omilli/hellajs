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
// Inline-candidate shape: a single-line `const NAME = "…";` declaration.
// Anything else (template literal, concatenation, multi-line) fails the full-line
// match and stays verbatim in the styles region.
const STRING_DECL_REGEX = /^const ([A-Za-z_$][\w$]*) = ("[^"]*");$/;
const OBJECT_DECL_REGEX = /^const ([A-Za-z_$][\w$]*) = \{$/;
const COMMENT_LINE_REGEX = /^(\/\/|\/\*|\*)/;
// Keyword-introduced local bindings of a candidate name: `const|let|var NAME`
// declarations and `catch (NAME)` headers. Parameter lists classify through
// matchKind's paren context instead of a pattern.
const KEYWORD_BINDING_REGEX = /(?:^|[^\w$])(?:const|let|var)\s+$/;
const CATCH_BINDING_REGEX = /catch\s*\($/;
// Identifier characters that make an opening paren a call's argument list
// rather than a parameter list (a name, closing bracket, or member access
// directly before `(` means the parens hold arguments, never bindings).
const CALL_CONTEXT_REGEX = /[\w$\]).]$/;
// Punctuation that may directly precede a genuine reference (after skipping
// spaces): operators, openers, and separators. A name preceded by a word
// character across a space is prose (JSX text), not a symbol use.
const REF_PRECEDERS = "([{,;:!&|?^%*=+<>~)]";
// Punctuation that may directly follow a genuine reference (after skipping
// spaces): member access, computed access, call, and operators. A name
// followed by a word character is a longer identifier or prose.
const REF_FOLLOWERS = ")]}.,;:?(*&|%!=<>+-/^~";

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
 * One classified block of a style module body: contiguous preceding comment
 * lines plus the declaration's lines. String declarations carry the declared
 * name and quoted literal for the tailwind inline transpose; object and other
 * blocks splice into the styles region verbatim.
 */
type DeclBlock = { lines: string[]; kind: "other" }
  | { lines: string[]; kind: "string"; name: string; literal: string }
  | { lines: string[]; kind: "object" };

/**
 * Splits a style module body into classified blocks: a block is a declaration
 * plus its contiguous preceding comment lines. A string declaration (`const
 * NAME = "…";`, single line) becomes an inline candidate; an object
 * declaration (`const NAME = {` through the trimmed `};` line) and any other
 * line (package import, blank) are kept for the styles region.
 * @param body Style module body lines, export prefixes already stripped.
 * @returns Blocks in order of appearance.
 */
function classifyDecls(body: string[]): DeclBlock[] {
  const blocks: DeclBlock[] = [];
  let comments: string[] = [];
  let i = 0;
  const len = body.length;
  while (i < len) {
    const line = body[i++]!;
    const trimmed = line.trim();
    if (trimmed === "") {
      blocks.push({ lines: [line], kind: "other" });
      continue;
    }
    if (COMMENT_LINE_REGEX.test(trimmed)) {
      comments.push(line);
      continue;
    }
    const stringDecl = STRING_DECL_REGEX.exec(line);
    if (stringDecl !== null) {
      blocks.push({ lines: [...comments, line], kind: "string", name: stringDecl[1]!, literal: stringDecl[2]! });
    } else if (OBJECT_DECL_REGEX.test(line)) {
      const lines = [...comments, line];
      while (i < len) {
        const inner = body[i++]!;
        lines.push(inner);
        if (inner.trim() === "};") break;
      }
      blocks.push({ lines, kind: "object" });
    } else {
      blocks.push({ lines: [...comments, line], kind: "other" });
    }
    comments = [];
  }
  if (comments.length > 0) blocks.push({ lines: comments, kind: "other" });
  return blocks;
}

/**
 * One lexer frame of the code mask: each code frame owns a bracket stack, so
 * a `}` always balances against its own frame and the `}` closing a `${…}`
 * interpolation (empty stack) pops the interpolation itself; string and
 * template frames consume their content opaquely.
 */
type MaskFrame = { kind: "code"; brackets: string[] } | { kind: "string"; quote: string } | { kind: "template" };

/**
 * Marks which character offsets of a canonical's outside text are executable
 * code, plus each code offset's innermost open bracket. Comments, string
 * literals, and template-literal text mask off while `${…}` interpolations
 * stay live, so a name visible to this mask is a symbol occurrence rather
 * than string content. Quotes inside template text (HTML attribute values,
 * prose) never open string frames — only backtick and `${` bounds do — and
 * the lexer state carries across lines through the joined text. The bracket
 * context distinguishes parameter lists from object literals: `, name:` is a
 * typed parameter only inside parens, an object-literal member otherwise.
 * @param text Outside-region text joined with newlines.
 * @returns Per-character mask (true when the offset is code) and per-character
 * bracket context (`(`, `[`, `{`, or empty).
 */
function codeMask(text: string): { mask: boolean[]; contexts: string[] } {
  const mask = new Array<boolean>(text.length).fill(true);
  const contexts = new Array<string>(text.length).fill("");
  const stack: MaskFrame[] = [{ kind: "code", brackets: [] }];
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    const frame = stack[stack.length - 1]!;
    if (frame.kind === "string") {
      mask[i] = false;
      if (ch === "\\") {
        mask[i + 1] = false;
        i += 2;
        continue;
      }
      if (ch === frame.quote) stack.pop();
      i++;
      continue;
    }
    if (frame.kind === "template") {
      mask[i] = false;
      if (ch === "\\") {
        mask[i + 1] = false;
        i += 2;
        continue;
      }
      if (ch === "`") {
        stack.pop();
        i++;
        continue;
      }
      if (ch === "$" && text[i + 1] === "{") {
        mask[i + 1] = false;
        stack.push({ kind: "code", brackets: [] });
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") {
        mask[i] = false;
        i++;
      }
      continue;
    }
    if (ch === "/" && text[i + 1] === "*") {
      while (i < text.length) {
        mask[i] = false;
        if (text[i] === "*" && text[i + 1] === "/") {
          mask[i + 1] = false;
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === "'" || ch === "\"") {
      mask[i] = false;
      stack.push({ kind: "string", quote: ch });
      i++;
      continue;
    }
    if (ch === "`") {
      mask[i] = false;
      stack.push({ kind: "template" });
      i++;
      continue;
    }
    if (ch === "{" || ch === "(" || ch === "[") {
      frame.brackets.push(ch);
      i++;
      continue;
    }
    if (ch === "}" || ch === ")" || ch === "]") {
      if (ch === "}" && frame.brackets.length === 0 && stack.length > 1) {
        stack.pop();
        i++;
        continue;
      }
      if (frame.brackets.length > 0) frame.brackets.pop();
      i++;
      continue;
    }
    contexts[i] = frame.brackets.length > 0 ? frame.brackets[frame.brackets.length - 1]! : "";
    i++;
  }
  return { mask, contexts };
}

/** Position class of a candidate-name occurrence on a canonical line. */
type NamePosition = "ref" | "noise" | "binding";

/**
 * Classifies a candidate-name occurrence on one line: keyword-introduced
 * declarations (`const|let|var NAME`, `catch (NAME)`) and parameter-list
 * positions bind a local — the conservative fallback — while JSX-tag and
 * attribute-name and `?`/`:`-typed-member positions are structural noise, and
 * every other code position is a substitutable reference. A parameter list is
 * distinguished from a call's argument list by the token before the opening
 * paren: an identifier or closing bracket means arguments, which never bind.
 * @param line Line holding the match.
 * @param start Match start offset within the line.
 * @param end Match end offset within the line.
 * @returns The position class.
 */
function matchKind(line: string, start: number, end: number, ctx: string): NamePosition {
  if (line[start - 1] === "<") return "noise";
  const before = line.slice(0, start);
  if (KEYWORD_BINDING_REGEX.test(before) || CATCH_BINDING_REGEX.test(before)) return "binding";
  let p = start - 1;
  while (p >= 0 && /\s/.test(line[p]!)) p--;
  const prev = p >= 0 ? line[p]! : "";
  let q = end;
  const lineLen = line.length;
  while (q < lineLen && /\s/.test(line[q]!)) q++;
  const next = q < lineLen ? line[q]! : "";
  if (ctx === "(" && (prev === "(" || prev === ",") && (next === ")" || next === "," || next === ":" || next === "=")) {
    const isCall = prev === "(" && (p === 0 ? false : CALL_CONTEXT_REGEX.test(line[p - 1]!));
    if (!isCall) return "binding";
  }
  if ((next === "?" || next === ":") && (p === -1 || prev === "{" || prev === "," || prev === ";")) return "noise";
  if (next === "=" && line[q + 1] !== "=" && line[q + 1] !== ">") return "noise";
  if ((p === -1 || REF_PRECEDERS.includes(prev)) && (q >= lineLen || REF_FOLLOWERS.includes(next))) return "ref";
  return "noise";
}

/**
 * Reports whether a candidate name binds a local anywhere in the canonical's
 * outside lines: comment lines and imports never hold symbols, masked offsets
 * (string content, template text) are not code, and only positions matchKind
 * classifies as bindings count. Any binding blocks the name's inline —
 * genuine references substitute instead of blocking.
 * @param name Candidate declaration name.
 * @param lines Lines to scan.
 * @param offsets Line start offsets within the joined text the mask was built from.
 * @param mask Code-position mask from codeMask.
 * @param skipFirst First line index to exclude (a candidate's own block), or -1.
 * @param skipLast Last line index to exclude (inclusive), or -1.
 * @returns True when a local binding of the name exists outside marker regions.
 */
function bindsLocal(name: string, lines: string[], offsets: number[], mask: boolean[], contexts: string[], skipFirst: number, skipLast: number): boolean {
  const ref = new RegExp(`(?<![\\w$."'-])${name}(?![\\w$-])`, "g");
  let i = 0;
  const len = lines.length;
  while (i < len) {
    const line = lines[i]!;
    const at = offsets[i]!;
    const excluded = i >= skipFirst && i <= skipLast;
    i++;
    if (excluded || COMMENT_LINE_REGEX.test(line.trim()) || IMPORT_REGEX.test(line)) continue;
    let match: RegExpExecArray | null;
    while ((match = ref.exec(line)) !== null) {
      const pos = at + match.index;
      if (!mask[pos]) continue;
      if (matchKind(line, match.index, match.index + name.length, contexts[pos]!) === "binding") return true;
    }
  }
  return false;
}

/**
 * Computes each line's start offset within the text formed by joining the
 * lines with newlines — the coordinate space of codeMask's mask.
 * @param lines Lines to index.
 * @returns Start offset per line index.
 */
function lineOffsets(lines: string[]): number[] {
  const offsets = new Array<number>(lines.length);
  let at = 0;
  let i = 0;
  while (i < lines.length) {
    offsets[i] = at;
    at += lines[i]!.length + 1;
    i++;
  }
  return offsets;
}

/**
 * Substitutes inlineable literals into the canonical's outside lines: the
 * `class={NAME}` and `class="${NAME}"` attribute forms collapse to the bare
 * literal, and every remaining code-position reference transposes to the
 * literal — re-masking after the collapse so offsets stay aligned. Comment
 * and import lines stay untouched; no symbol can live there.
 * @param lines Outside lines, dropped candidate lines already blanked.
 * @param literals Inlineable name → quoted literal map.
 * @returns The rewritten lines.
 */
function substituteLiterals(lines: string[], literals: Map<string, string>): string[] {
  if (literals.size === 0) return lines;
  const alts = Array.from(literals.keys()).join("|");
  const collapse = new RegExp(`class=(?:\\{(${alts})\\}|"\\$\\{(${alts})\\}")`, "g");
  const collapsed = lines.map((line) => {
    if (line === "" || COMMENT_LINE_REGEX.test(line.trim()) || IMPORT_REGEX.test(line)) return line;
    return line.replace(collapse, (attr, braces, quoted) => `class=${literals.get(braces ?? quoted)!}`);
  });
  const { mask, contexts } = codeMask(collapsed.join("\n"));
  const offsets = lineOffsets(collapsed);
  const ref = new RegExp(`(?<![\\w$."'-])(${alts})(?![\\w$-])`, "g");
  return collapsed.map((line, i) => {
    if (line === "" || COMMENT_LINE_REGEX.test(line.trim()) || IMPORT_REGEX.test(line)) return line;
    const at = offsets[i]!;
    return line.replace(ref, (name: string, matched: string, index: number): string => {
      const pos = at + index;
      return mask[pos] && matchKind(line, index, index + name.length, contexts[pos]!) === "ref" ? literals.get(name)! : name;
    });
  });
}

/**
 * Splits classified blocks into kept styles-region lines and the string
 * literals safe to transpose, and rewrites the canonical's outside lines to
 * match. A string declaration is inlineable when no local binding of its name
 * exists outside the marker regions — comments, imports, string content,
 * property signatures, JSX tags, and attribute names never count (codeMask
 * plus matchKind classify every occurrence), and genuine outside references
 * resolve by substitution instead of keeping the declaration. Canonical-level
 * string constants (runtime values like event names) join the same map and
 * drop from the output with their preceding comments. A name with a local
 * binding keeps the conservative fallback: declaration kept, references
 * untouched.
 * @param moduleBlocks Classified style-module blocks.
 * @param outsideBlocks Classified canonical outside blocks.
 * @param outsideLines Canonical lines outside every marker region.
 * @param offsets Line start offsets within the joined outside text.
 * @param mask Code-position mask over the joined outside text.
 * @returns Styles-region splice lines, name → quoted literal per inlineable
 * string, and the rewritten outside lines aligned 1:1 with outsideLines
 * (dropped declarations blanked for the blank-line-run collapse).
 */
function inlineStringDecls(
  moduleBlocks: DeclBlock[],
  outsideBlocks: DeclBlock[],
  outsideLines: string[],
  offsets: number[],
  mask: boolean[],
  contexts: string[],
): { styles: string[]; literals: Map<string, string>; outside: string[] } {
  const styles: string[] = [];
  const literals = new Map<string, string>();
  let i = 0;
  const bLen = moduleBlocks.length;
  while (i < bLen) {
    const block = moduleBlocks[i++]!;
    if (block.kind === "string" && !bindsLocal(block.name, outsideLines, offsets, mask, contexts, -1, -1)) {
      literals.set(block.name, block.literal);
      continue;
    }
    let l = 0;
    const lLen = block.lines.length;
    while (l < lLen) styles.push(block.lines[l++]!);
  }
  const dropped = new Array<boolean>(outsideLines.length).fill(false);
  let at = 0;
  let j = 0;
  const oLen = outsideBlocks.length;
  while (j < oLen) {
    const block = outsideBlocks[j++]!;
    const first = at;
    const last = at + block.lines.length - 1;
    at = last + 1;
    if (block.kind === "string" && !bindsLocal(block.name, outsideLines, offsets, mask, contexts, first, last)) {
      literals.set(block.name, block.literal);
      let l = first;
      while (l <= last) dropped[l++] = true;
    }
  }
  const blanked = outsideLines.map((line, idx) => (dropped[idx] ? "" : line));
  return { styles, literals, outside: substituteLiterals(blanked, literals) };
}

/**
 * Replaces every word-boundary occurrence of an inlineable string's name in
 * the compose-region lines with its quoted literal — one member occurrence per
 * match site: the lookbehind excludes property access (`props.size`), longer
 * identifiers (`legendVariants`), and quoted text, so only genuine array
 * members and ternary operands transpose (semantics-preserving either way).
 * Trailing commas and indentation are preserved — replacement spans only the
 * identifier.
 * @param body Compose-region body lines, already cn-wrapped.
 * @param literals Inlineable name → quoted literal map.
 * @returns The transposed body lines.
 */
function inlineComposeMembers(body: string[], literals: Map<string, string>): string[] {
  if (literals.size === 0) return body;
  const names = Array.from(literals.keys());
  const pattern = new RegExp(`(?<![\\w$."'])(${names.join("|")})(?![\\w$])`, "g");
  const inlined: string[] = [];
  let i = 0;
  const len = body.length;
  while (i < len) {
    inlined.push(body[i++]!.replace(pattern, (name) => literals.get(name)!));
  }
  return inlined;
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
 * `cn(…)`, inlines every string declaration at its use sites — compose
 * members, static class attributes, and outside references — dropping the
 * declarations (only keyed maps stay in the styles region; a same-named local
 * binding keeps the declaration as a conservative fallback), collapses
 * blank-line runs left by emptied regions, and injects the shared `cn` import
 * after the file's last import.
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
  let stylesBody = moduleBody;
  let literals = new Map<string, string>();
  let rewritten: string[] | undefined;
  if (style === "tailwind") {
    const outside: string[] = [];
    let b = 0;
    const bLen = blocks.length;
    while (b < bLen) {
      const block = blocks[b++]!;
      if (block.kind === "line") outside.push(block.text);
    }
    const offsets = lineOffsets(outside);
    const { mask, contexts } = codeMask(outside.join("\n"));
    const inlined = inlineStringDecls(classifyDecls(moduleBody), classifyDecls(outside), outside, offsets, mask, contexts);
    stylesBody = inlined.styles;
    literals = inlined.literals;
    rewritten = inlined.outside;
  }
  const out: string[] = [];
  let j = 0;
  const outLen = blocks.length;
  let lineIdx = 0;
  while (j < outLen) {
    const block = blocks[j++]!;
    if (block.kind === "line") {
      out.push(rewritten === undefined ? block.text : rewritten[lineIdx]!);
      lineIdx++;
      continue;
    }
    if (block.name === "styles") {
      let s = 0;
      const moduleLen = stylesBody.length;
      while (s < moduleLen) out.push(stylesBody[s++]!);
      continue;
    }
    const compose = style === "css" ? block.body : inlineComposeMembers(wrapComposeWithCn(block.body), literals);
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
  const text = out.join("\n");
  return style === "tailwind" ? text.replace(/\n{3,}/g, "\n\n") : text;
}
