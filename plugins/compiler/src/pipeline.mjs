// Stage orchestration: validate options → cheap JSX sniff → oxc-transform
// TS-strip with `jsx: 'preserve'` (ts/tsx only) → acorn + acorn-jsx parse →
// walker pass → astring generate → sourcemap chain (@ampproject/remapping
// composes the strip-stage map with the print-stage map). Returns null when
// the parsed program contains no JSX — the wrapper then lets Vite/Rollup
// handle the file natively.

import { transformSync } from "oxc-transform";
import * as acorn from "acorn";
import jsxParser from "acorn-jsx";
import { generate } from "astring";
import remapping from "@ampproject/remapping";
import { transformProgram } from "./transform.mjs";

const VALID_TARGETS = new Set(["ast", "dom"]);
const VALID_KEYS = new Set(["filename", "lang", "target"]);
const SUPPORTED_LANGS = new Set(["js", "jsx", "ts", "tsx"]);

// acorn-jsx extends acorn's Parser once per process — the plugin itself is
// stateless per parse.
const parser = acorn.Parser.extend(jsxParser());

const PARSE_OPTIONS = { ecmaVersion: "latest", sourceType: "module", locations: true };

/**
 * Validate options at call time — the single export carries no separate
 * validator: a non-object options value, an unknown key, or a target outside
 * `{ "ast", "dom" }` throws before the sniff, so the wrappers' empty-input
 * probe call rejects bad config eagerly.
 * @param {unknown} options
 * @returns {{ filename: string, lang: "js" | "jsx" | "ts" | "tsx" | undefined, target: "ast" | "dom" }}
 * @throws {Error} When options is not an object, carries unknown keys, or target is not "ast"/"dom".
 */
function validateOptions(options) {
  if (options === null || typeof options !== "object" || Array.isArray(options)) {
    throw new Error(`[hellajs-compiler] options must be an object, received ${options}`);
  }
  const keys = Object.keys(options);
  let i = 0;
  while (i < keys.length) {
    const key = keys[i++];
    if (!VALID_KEYS.has(key)) {
      throw new Error(
        `[hellajs-compiler] unknown option "${key}" — only "filename", "lang" and "target" are supported`,
      );
    }
  }
  const target = options.target === undefined ? "dom" : options.target;
  if (!VALID_TARGETS.has(target)) {
    throw new Error(`[hellajs-compiler] invalid target "${target}" — expected "ast" or "dom"`);
  }
  const lang = options.lang;
  if (lang !== undefined && !SUPPORTED_LANGS.has(lang)) {
    throw new Error(
      `[hellajs-compiler] invalid lang "${lang}" — expected "js", "jsx", "ts" or "tsx"`,
    );
  }
  return { filename: options.filename, lang, target };
}

/**
 * Resolve the source language: an explicit `lang` option wins; otherwise the
 * filename extension infers it (.tsx/.ts/.jsx; everything else — .js, .mjs,
 * .cjs, unknown — compiles as js).
 * @param {string} filename
 * @param {"js" | "jsx" | "ts" | "tsx" | undefined} lang
 * @returns {"js" | "jsx" | "ts" | "tsx"}
 */
function resolveLang(filename, lang) {
  if (lang !== undefined) return lang;
  if (/\.tsx$/i.test(filename)) return "tsx";
  if (/\.ts$/i.test(filename)) return "ts";
  if (/\.jsx$/i.test(filename)) return "jsx";
  return "js";
}

// Standard base64 VLQ alphabet.
const VLQ_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Encode one value as base64 VLQ.
 * @param {number} value
 * @returns {string}
 */
function encodeVLQ(value) {
  let vlq = value < 0 ? (-value << 1) | 1 : value << 1;
  let out = "";
  do {
    let digit = vlq & 31;
    vlq >>>= 5;
    if (vlq > 0) digit |= 32;
    out += VLQ_CHARS[digit];
  } while (vlq > 0);
  return out;
}

/**
 * Walk the post-transform program and the re-parsed output AST in lockstep
 * (both parse with the same acorn build, and astring prints a deterministic
 * rendering of the program, so the trees pair 1:1), emitting one mapping per
 * node start: generated position → original position.
 * @param {import("estree").Node} orig
 * @param {import("estree").Node} gen
 * @param {(orig: { line: number, column: number }, gen: { line: number, column: number }) => void} emit
 */
function pairWalk(orig, gen, emit) {
  if (!orig || !gen || typeof orig.type !== "string" || orig.type !== gen.type) return;
  if (orig.loc && gen.loc) emit(orig.loc.start, gen.loc.start);
  const keys = Object.keys(orig);
  let i = 0;
  while (i < keys.length) {
    const key = keys[i++];
    if (key === "type" || key === "loc" || key === "range" || key === "start" || key === "end")
      continue;
    const origVal = orig[key];
    const genVal = gen[key];
    if (Array.isArray(origVal) && Array.isArray(genVal)) {
      const len = Math.min(origVal.length, genVal.length);
      let j = 0;
      while (j < len) {
        pairWalk(origVal[j], genVal[j], emit);
        j++;
      }
    } else if (
      origVal &&
      genVal &&
      typeof origVal === "object" &&
      typeof origVal.type === "string"
    ) {
      pairWalk(origVal, genVal, emit);
    }
  }
}

/**
 * Build the print-stage source map: re-parse the printed output with acorn
 * (positions = generated), pair its nodes with the post-transform program
 * (positions = original), and encode node-start mappings.
 * @param {import("estree").Program} program Post-transform program (original positions).
 * @param {string} printed Astring output.
 * @param {string} source The parse-stage source the program's positions refer to.
 * @param {string} filename
 * @returns {import("@ampproject/remapping").DecodedSourceMap | import("@ampproject/remapping").EncodedSourceMap} Mappings from printed output back to `source`.
 */
function buildPrintMap(program, printed, source, filename) {
  const printedAst = /** @type {import("estree").Program} */ (parser.parse(printed, PARSE_OPTIONS));
  /** @type {{ genLine: number, genCol: number, origLine: number, origCol: number }[]} */
  const segments = [];
  pairWalk(program, printedAst, (orig, gen) => {
    segments.push({
      genLine: gen.line - 1,
      genCol: gen.column,
      origLine: orig.line - 1,
      origCol: orig.column,
    });
  });
  segments.sort((a, b) => a.genLine - b.genLine || a.genCol - b.genCol);

  let mappings = "";
  let prevGenLine = 0;
  let prevGenCol = 0;
  let prevOrigLine = 0;
  let prevOrigCol = 0;
  let i = 0;
  while (i < segments.length) {
    const segment = segments[i++];
    // One segment per generated position: parent and child nodes sharing a
    // start emit identical targets — later duplicates drop.
    if (
      i > 1 &&
      segment.genLine === segments[i - 2].genLine &&
      segment.genCol === segments[i - 2].genCol
    )
      continue;
    while (prevGenLine < segment.genLine) {
      mappings += ";";
      prevGenLine++;
      prevGenCol = 0;
    }
    if (mappings.length > 0 && !mappings.endsWith(";")) mappings += ",";
    mappings += encodeVLQ(segment.genCol - prevGenCol);
    mappings += encodeVLQ(0); // source index — single source
    mappings += encodeVLQ(segment.origLine - prevOrigLine);
    mappings += encodeVLQ(segment.origCol - prevOrigCol);
    prevGenCol = segment.genCol;
    prevOrigLine = segment.origLine;
    prevOrigCol = segment.origCol;
  }
  return {
    version: 3,
    file: filename,
    sources: [filename],
    sourcesContent: [source],
    names: [],
    mappings,
  };
}

/**
 * Transform JSX source into HellaJS runtime code.
 *
 * The pass is total over JSX syntax (every JSXElement/JSXFragment is replaced
 * under both targets), so astring never needs to print JSX nodes; astring's
 * formatting is the engine's printer freedom — the suite asserts emission
 * AST-normalized, never byte-for-byte.
 * @param {string} code JSX source.
 * @param {{ filename: string, lang?: "js" | "jsx" | "ts" | "tsx", target?: "ast" | "dom" }} options
 *   `target` defaults to `"dom"` (the wrapper-level client default — deliberately
 *   not the server's `"ast"` currency).
 * @returns {{ code: string, map: object | null } | null} Transformed code plus the
 *   chained source map, or null when the input carries no JSX.
 * @throws {Error} When options is not an object, carries unknown keys, or target/lang is invalid.
 */
export function transform(code, options) {
  const { filename, lang, target } = validateOptions(options);

  // Cheap sniff: every JSX contains `<`; false negatives are impossible and
  // false positives only cost a parse that returns null.
  if (!code.includes("<")) return null;

  let source = code;
  let stripMap = null;
  const resolvedLang = resolveLang(filename, lang);
  if (resolvedLang === "ts" || resolvedLang === "tsx") {
    const result = transformSync(filename, code, {
      lang: resolvedLang,
      jsx: "preserve",
      sourcemap: true,
    });
    let i = 0;
    while (i < result.errors.length) {
      const error = result.errors[i++];
      if (error.severity === "Error") throw new Error(`[hellajs-compiler] ${error.message}`);
    }
    source = result.code;
    stripMap = result.map ?? null;
  }

  let program;
  try {
    program = parser.parse(source, PARSE_OPTIONS);
  } catch (error) {
    throw new Error(`[hellajs-compiler] ${/** @type {Error} */ (error).message}`);
  }

  const transformed = transformProgram(program, { target });
  if (!transformed) return null;

  const printed = generate(program, { indent: "  " });
  const printMap = buildPrintMap(program, printed, source, filename);
  // Compose output→original: the print map's source resolves through the strip
  // map on the root load only (ctx.importer === "") — nested loads (the strip
  // map's own source, the same filename) return null so remapping treats the
  // original file as unmodified instead of cycling.
  const map = stripMap
    ? remapping(printMap, (source, ctx) => (ctx.importer === "" ? stripMap : null))
    : printMap;
  return { code: printed, map };
}
