interface DemoCodeOptions {
  /**
   * Prefix the module prelude (imports and module-level declarations) ahead
   * of the sliced export block, so the displayed code is copy-complete. The
   * hero "Playground" card uses this; example cards show the export block
   * only.
   */
  withImports?: boolean;
}

interface Declaration {
  name: string;
  /** Index of the `export` keyword */
  start: number;
  /** Index just past the body's closing brace */
  end: number;
}

interface Token {
  word: string;
  start: number;
  /** Brace depth at the word — `export` declarations only count at 0 */
  depth: number;
}

const WORD = /[A-Za-z0-9_$]/;
const WORD_ALL = new RegExp("[A-Za-z0-9_$]+", "g");
const NAME = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

/**
 * Slices one top-level `export default function <Name>` / `export function
 * <Name>` block out of a demo wrapper's raw source — the View Code surface
 * for the ui pages' demo cards. The scanner is string-, template- (including
 * `${…}` interpolations), and comment-aware, so braces inside displayed code
 * never skew the block bounds. Loud by construction: an unknown export name
 * or unbalanced module source throws at build time rather than rendering an
 * empty card — the registry marker-parser philosophy, with zero per-file
 * markers. Pair with the kit's authoring rule: every demo export is a
 * top-level `export default function` / `export function` block.
 * @param raw Raw module source (a `?raw` import of the wrapper)
 * @param exportName Function name of the export to slice
 * @param options `withImports` prefixes the module prelude ahead of the block
 * @returns The sliced source text
 */
export function demoCode(raw: string, exportName: string, options: DemoCodeOptions = {}): string {
  const declarations = scanDeclarations(raw);
  const found = declarations.find((d) => d.name === exportName);
  if (!found) {
    const names = declarations.map((d) => d.name).join(", ") || "none";
    throw new Error(`demoCode(): no top-level export function "${exportName}" (found: ${names})`);
  }
  if (options.withImports) {
    if (declarations[0] !== found) {
      throw new Error(`demoCode(): "${exportName}" is not the module's first export — withImports would leak sibling exports into the prelude`);
    }
    const preludeEnd = declarations[0]?.start ?? raw.length;
    return `${raw.slice(0, preludeEnd).trim()}\n\n${raw.slice(found.start, found.end)}`;
  }
  return raw.slice(found.start, found.end);
}

/**
 * One lex over the source: a frame stack discriminates template-literal text
 * from code (interpolations push a code frame), strings and comments are
 * skipped, and every code word is recorded with its brace depth. The
 * declaration match is then a pure token-sequence check — `export`
 * [`default`] `function` <Name>, all at depth 0 and consecutive — and the
 * body bounds come from `skipBalanced` starting at the name.
 */
function scanDeclarations(raw: string): Declaration[] {
  const tokens = codeTokens(raw);
  const declarations: Declaration[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i]!.word !== "export" || tokens[i]!.depth !== 0) continue;
    let j = i + 1;
    if (tokens[j]?.word === "default") j++;
    if (tokens[j]?.word !== "function" || tokens[j]!.depth !== 0) continue;
    const name = tokens[j + 1];
    if (!name || name.depth !== 0 || !NAME.test(name.word)) continue;
    const bodyEnd = functionBodyEnd(raw, name.start);
    if (bodyEnd === undefined) continue;
    declarations.push({ name: name.word, start: tokens[i]!.start, end: bodyEnd + 1 });
  }
  return declarations;
}

/**
 * From a declaration's name, scans past the balanced parameter parens and
 * returns the index of the body's closing brace. Undefined when the shape is
 * not `name(params) { body }` (e.g. a bare expression between tokens).
 */
function functionBodyEnd(raw: string, nameStart: number): number | undefined {
  WORD_ALL.lastIndex = nameStart;
  const name = WORD_ALL.exec(raw)?.[0] ?? "";
  let i = skipSpace(raw, nameStart + name.length);
  if (raw[i] !== "(") return undefined;
  i = skipSpace(raw, skipBalanced(raw, i, ")") + 1);
  if (raw[i] !== "{") return undefined;
  return skipBalanced(raw, i, "}");
}

function skipSpace(raw: string, i: number): number {
  while (i < raw.length && /\s/.test(raw[i]!)) i++;
  return i;
}

/**
 * Walks the source recording every code word with its brace depth. Template
 * literal text is skipped but its `${…}` interpolations are code: each opens
 * a frame whose closing `}` restores the depth captured at `${` — the frame
 * check must run before any plain-brace handling on the same character.
 */
function codeTokens(raw: string): Token[] {
  const tokens: Token[] = [];
  const frames: Array<"template" | "interp"> = [];
  const interpBase: number[] = [];
  let depth = 0;
  let i = 0;
  while (i < raw.length) {
    if (frames[frames.length - 1] === "template") {
      if (raw[i] === "\\") {
        i += 2;
        continue;
      }
      if (raw[i] === "`") {
        frames.pop();
        i++;
        continue;
      }
      if (raw.startsWith("${", i)) {
        frames.push("interp");
        interpBase.push(depth);
        depth++;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (raw.startsWith("//", i)) {
      const end = raw.indexOf("\n", i);
      i = end < 0 ? raw.length : end + 1;
      continue;
    }
    if (raw.startsWith("/*", i)) {
      const end = raw.indexOf("*/", i + 2);
      if (end < 0) throw new Error("demoCode(): unterminated block comment in module source");
      i = end + 2;
      continue;
    }
    const c = raw[i]!;
    if ((c === '"' || c === "'") && opensString(raw, i)) {
      i = skipString(raw, i, c);
      continue;
    }
    if (c === "`") {
      frames.push("template");
      i++;
      continue;
    }
    if (c === "{") depth++;
    if (c === "}") {
      depth--;
      if (frames[frames.length - 1] === "interp" && depth === interpBase[interpBase.length - 1]) {
        frames.pop();
        interpBase.pop();
      } else if (depth < 0) {
        throw new Error("demoCode(): unbalanced braces in module source");
      }
    }
    if (WORD.test(c)) {
      WORD_ALL.lastIndex = i;
      const word = WORD_ALL.exec(raw)![0];
      tokens.push({ word, start: i, depth });
      i += word.length;
      continue;
    }
    i++;
  }
  if (frames.length > 0) throw new Error("demoCode(): unterminated template literal in module source");
  return tokens;
}

/**
 * True when the quote at `i` opens a JS string. A quote directly after a word
 * character is JSX text ("wrapper's", "you're" inside an attribute value is
 * already swallowed by its own string) — wrappers never begin a string that
 * way, and treating it as text keeps JSX prose from swallowing real code.
 */
function opensString(raw: string, i: number): boolean {
  let j = i - 1;
  while (j >= 0 && /\s/.test(raw[j]!)) j--;
  return j < 0 || !WORD.test(raw[j]!);
}

function skipString(raw: string, open: number, quote: string): number {
  let i = open + 1;
  while (i < raw.length) {
    if (raw[i] === "\\") {
      i += 2;
      continue;
    }
    if (raw[i] === quote) return i + 1;
    i++;
  }
  throw new Error("demoCode(): unterminated string in module source");
}

/**
 * Index of the closer matching the opener at `open` (`open` is `(` or `{`).
 * The other bracket kind self-cancels across balanced code, so one walker
 * serves both targets; only the return condition names the target. Same
 * frame machine as `codeTokens`, same interp-before-plain ordering on `}`.
 */
function skipBalanced(raw: string, open: number, closeChar: string): number {
  const frames: Array<"template" | "interp"> = [];
  const interpBase: number[] = [];
  let depth = 0;
  let i = open;
  while (i < raw.length) {
    if (frames[frames.length - 1] === "template") {
      if (raw[i] === "\\") {
        i += 2;
        continue;
      }
      if (raw[i] === "`") {
        frames.pop();
        i++;
        continue;
      }
      if (raw.startsWith("${", i)) {
        frames.push("interp");
        interpBase.push(depth);
        depth++;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (raw.startsWith("//", i)) {
      const end = raw.indexOf("\n", i);
      i = end < 0 ? raw.length : end + 1;
      continue;
    }
    if (raw.startsWith("/*", i)) {
      const end = raw.indexOf("*/", i + 2);
      if (end < 0) throw new Error("demoCode(): unterminated block comment in module source");
      i = end + 2;
      continue;
    }
    const c = raw[i]!;
    if ((c === '"' || c === "'") && opensString(raw, i)) {
      i = skipString(raw, i, c);
      continue;
    }
    if (c === "`") {
      frames.push("template");
      i++;
      continue;
    }
    if (c === "{" || c === "(") depth++;
    if (c === "}" || c === ")") {
      depth--;
      if (frames[frames.length - 1] === "interp" && depth === interpBase[interpBase.length - 1]) {
        frames.pop();
        interpBase.pop();
      } else if (c === closeChar && depth === 0 && frames.length === 0) {
        return i;
      } else if (depth < 0) {
        throw new Error("demoCode(): unbalanced brackets in module source");
      }
    }
    i++;
  }
  throw new Error("demoCode(): unbalanced brackets in module source");
}
