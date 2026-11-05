import fs from "node:fs";
import path from "node:path";
import type { MarkdownBlock } from "./blocks.ts";

/**
 * Module emission for extracted snippet blocks: the shared back half of the
 * snippet typecheck pipelines, ported verbatim from `doc-snippets.ts` —
 * import-union hoisting + merge, per-block `{ }` scopes inside an async
 * IIFE, defensive `;` after statement-ending JSX/template closers, and the
 * executable-statement / signature-only block classification. Skip policy
 * (which blocks to drop) stays with each consumer.
 */

/** An emitted scratch module. */
export interface EmittedModule {
  /** Absolute path of the written module. */
  file: string;
  /** Number of blocks emitted into this module. */
  blockCount: number;
}

/** Fence language tags emitted into TS-family modules. */
export const LANGS_TS = new Set(["typescript", "ts", "tsx", "jsx"]);
/** Fence language tags emitted into js-family modules (parsed, not strict-TS-checked). */
export const LANGS_JS = new Set(["js"]);

const CONTINUATION_RE = /^[.([,:?+*&|)}\]]|^(=>|&&|\|\||\?\?)/;
/** Bare specifier other than `@hellajs/*` — external import (whole block is policy-skipped). */
export const EXTERNAL_IMPORT_RE = /^import\s[^"']*from\s+["'](?!@hellajs\/)[^"']+["']/;
/** Real assignment `=` — arrows and comparators stripped first. */
const ASSIGN_RE = /(?<![!=<>])=(?!=)/;

/** Strips `=>` and type-parameter lists so arrows and generic defaults (`<T = U>`)
 * never read as assignments. */
function stripArrows(line: string): string {
  return line.replace(/=>/g, "  ").replace(/<[^<>]*>/g, " ");
}
/** Executable-statement markers: declarations, control flow, call statements, JSX. */
const EXECUTABLE_RE = /\b(const|let|var|return|await|new|throw)\b|^[A-Za-z_$][\w$.]*\s*\(|^</;

/**
 * Splits block text into import statements (each normalized to one line) and
 * the remaining body lines. Handles multi-line named imports: an `import`
 * line consumes through the line that closes the statement (ends with the
 * module specifier and optional semicolon).
 * @param text The block text
 * @returns The import statements and the body lines
 */
export function splitImports(text: string): { imports: string[]; body: string[] } {
  const imports: string[] = [];
  const body: string[] = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (!/^import\b/.test(lines[i]!.trim())) {
      body.push(lines[i]!);
      continue;
    }
    const statement: string[] = [lines[i]!.trim()];
    while (
      i + 1 < lines.length &&
      !/(?:from\s+)?["'][^"']+["']\s*;?\s*$/.test(statement[statement.length - 1]!)
    ) {
      i += 1;
      statement.push(lines[i]!.trim());
    }
    imports.push(statement.join(" ").replace(/\s+/g, " "));
  }
  return { imports, body };
}

/**
 * Whether a block holds executable statements (vs. type/interface/declare
 * declarations and bare signatures). Import lines are already stripped.
 * @param bodyLines The block's body lines
 * @returns True if at least one line executes something
 */
export function isExecutableBlock(bodyLines: string[]): boolean {
  return bodyLines.some((l) => {
    const t = l.trim();
    if (t.startsWith("declare ") || t.startsWith("type ") || t.startsWith("interface "))
      return false;
    if (t.startsWith("}")) return false; // closing a type/declare block
    if (/^(export\s+)?function\b/.test(t) && !t.includes("{")) return false; // signature line (type-param defaults carry `=`)
    if (/^const\s+\w+\s*:\s*[^=]+$/.test(t)) return false; // const signature (no initializer)
    if (/^\w+\s*\(.*\)\s*:\s*[^=]*;$/.test(t)) return false; // type-literal member signature
    return EXECUTABLE_RE.test(t) || ASSIGN_RE.test(stripArrows(t));
  });
}

/**
 * Merges a doc's import statements into a deduped module-level union: named
 * imports from the same module combine; bare/side-effect imports pass once.
 * @param statements One-line import statements
 * @returns The merged top-level import statements
 */
function mergeImports(statements: string[]): string[] {
  const named = new Map<string, string[]>();
  const raw: string[] = [];
  for (const statement of statements) {
    const m = statement.match(/^import\s+\{(.*)\}\s+from\s+["']([^"']+)["'];?$/);
    if (m) {
      const names = m[1]!
        .split(",")
        .map((n) => n.trim())
        .filter(Boolean);
      named.set(m[2]!, [...(named.get(m[2]!) ?? []), ...names]);
      continue;
    }
    if (!raw.includes(statement)) raw.push(statement);
  }
  const imports: string[] = [];
  for (const [mod, names] of named) {
    imports.push(`import { ${[...new Set(names)].join(", ")} } from "${mod}";`);
  }
  for (const statement of raw) {
    imports.push(statement.endsWith(";") ? statement : `${statement};`);
  }
  return imports;
}

/**
 * Appends statement-terminating semicolons: after JSX closing tags and after
 * template-literal closers, when the next non-empty line starts a new
 * statement. Backtick parity is tracked so a semicolon never lands inside an
 * open template string. This suppresses the TS2657 adjacent-JSX false
 * positive without touching the doc text.
 * @param text The concatenated block body
 * @returns The body with defensive semicolons inserted
 */
function terminateStatements(text: string): string {
  const lines = text.split("\n");
  let inTemplate = false;
  for (let i = 0; i < lines.length; i++) {
    const ticks = lines[i]!.split("`").length - 1;
    const closesAtEol = inTemplate && ticks % 2 === 1 && lines[i]!.trimEnd().endsWith("`");
    if (ticks % 2 === 1) inTemplate = !inTemplate;
    if (inTemplate || (ticks % 2 === 1 && !closesAtEol)) continue;
    const t = lines[i]!.trimEnd();
    const needs = t.endsWith("/>") || /<\/[^>]*>$/.test(t) || (closesAtEol && t.endsWith("`"));
    if (!needs) continue;
    let next = "";
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j]!.trim()) {
        next = lines[j]!.trim();
        break;
      }
    }
    if (next && !CONTINUATION_RE.test(next)) lines[i] = `${t};`;
  }
  return lines.join("\n");
}

/**
 * Emits modules for a block list (TS-family and JS-family separately), with
 * breadcrumb comments mapping diagnostics back to source markdown lines.
 * Per-doc semantics ported from `doc-snippets.ts::emitModules`: doc-wide
 * import union hoisted + merged; each block opens a nested `{ }` scope
 * inside the previous block's scope (chaining stays legal while same-name
 * reuse shadows instead of colliding); blocks declaring ambient bindings
 * (`declare const …`) hoist to module scope (TS1184).
 * @param blocks The already-filtered blocks to emit
 * @param outFileBase Output path without extension (extension chosen per family)
 * @param breadcrumb Builds the breadcrumb comment for one block, given its
 * index within its family
 * @returns The emitted module descriptors
 */
export function emitModules(
  blocks: MarkdownBlock[],
  outFileBase: string,
  breadcrumb: (block: MarkdownBlock, index: number) => string,
): EmittedModule[] {
  const emitted: EmittedModule[] = [];
  if (blocks.length === 0) return emitted;

  for (const [family, langs] of [
    ["ts", LANGS_TS],
    ["js", LANGS_JS],
  ] as const) {
    const familyBlocks = blocks.filter((b) => langs.has(b.lang));
    if (familyBlocks.length === 0) continue;

    const statements: string[] = [];
    const scopes: string[] = [];
    for (const [idx, block] of familyBlocks.entries()) {
      const { imports, body } = splitImports(block.text);
      statements.push(...imports);
      scopes.push(`${breadcrumb(block, idx)}\n${body.join("\n")}`);
    }
    const imports = mergeImports(statements).join("\n");
    // Nested scoping: each block opens a brace inside the previous block's
    // scope (see function comment). Ambient declarations hoist to module scope.
    const hoisted = scopes.filter((sc) => /^(declare|export) /m.test(sc));
    const inline = scopes.filter((sc) => !hoisted.includes(sc));
    const bodyText =
      terminateStatements(inline.join("\n{\n")) + "\n" + "}".repeat(Math.max(inline.length - 1, 0));

    const isTsx = familyBlocks.some((b) => b.lang === "tsx" || b.lang === "jsx");
    const file = family === "ts" ? `${outFileBase}${isTsx ? ".tsx" : ".ts"}` : `${outFileBase}.js`;
    const content =
      family === "ts"
        ? `${imports}\n\n${hoisted.join("\n")}\n\nexport async function __doc() {\n${bodyText}\n}\n__doc();\n`
        : `${imports}\n\n${hoisted.join("\n")}\n\n${bodyText}\n`;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    emitted.push({ file, blockCount: familyBlocks.length });
  }
  return emitted;
}
