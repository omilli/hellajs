import { describe, expect, test } from "vite-plus/test";
import { applyStyleVariant } from "@hellajs/ui";

const canonical = [
  'import type { HTMLAttributes } from "@hellajs/dom";',
  "",
  "// @hella:styles",
  "// @hella:end",
  "",
  "interface P { class?: string }",
  "",
  "export default function X(p: P) {",
  "  return <p class={",
  "    // @hella:compose",
  "    [",
  "      base,",
  "      p.class,",
  "    ]",
  "    // @hella:end",
  "  }></p>;",
  "}",
].join("\n");

const cssModule = [
  'import { style } from "@hellajs/css";',
  "",
  'export const base = style({}, { label: "x" });',
  "",
].join("\n");

const tailwindModule = ['export const base = "x-base";', ""].join("\n");

describe("applyStyleVariant", () => {
  test("css pass splices the style module body and keeps the compose array verbatim", () => {
    expect(applyStyleVariant(canonical, cssModule, "css")).toBe(
      [
        'import type { HTMLAttributes } from "@hellajs/dom";',
        "",
        'import { style } from "@hellajs/css";',
        "",
        'const base = style({}, { label: "x" });',
        "",
        "interface P { class?: string }",
        "",
        "export default function X(p: P) {",
        "  return <p class={",
        "    [",
        "      base,",
        "      p.class,",
        "    ]",
        "  }></p>;",
        "}",
      ].join("\n"),
    );
  });

  test("single-line compose arrays wrap in place", () => {
    const single = [
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function X() {",
      "  return <p class={",
      "    // @hella:compose",
      "    [base, p.class]",
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    expect(applyStyleVariant(single, tailwindModule, "tailwind")).toContain(
      'cn("x-base", p.class)',
    );
  });

  test("an unclosed section in the canonical throws", () => {
    const unbalanced = '// @hella:styles\nconst base = "a";\n';
    expect(() => applyStyleVariant(unbalanced, cssModule, "css")).toThrow(
      '[ui] applyStyleVariant: section "styles" is never closed with @hella:end',
    );
  });

  test("an end marker without an open section throws", () => {
    const orphaned = 'const base = "a";\n// @hella:end\n';
    expect(() => applyStyleVariant(orphaned, cssModule, "css")).toThrow(
      "[ui] applyStyleVariant: @hella:end without an open section",
    );
  });

  test("a section opening inside another section throws", () => {
    const nested = '// @hella:styles\n// @hella:compose\nconst base = "a";\n// @hella:end\n';
    expect(() => applyStyleVariant(nested, cssModule, "css")).toThrow(
      '[ui] applyStyleVariant: section "styles" is still open when section "compose" opens',
    );
  });

  test("an unknown marker line throws instead of shipping as a comment", () => {
    const legacy = '// @hella:imports\nimport { style } from "@hellajs/css";\n// @hella:end\n';
    expect(() => applyStyleVariant(legacy, cssModule, "css")).toThrow(
      '[ui] applyStyleVariant: unknown marker "// @hella:imports"',
    );
  });

  test("a duplicate styles region throws", () => {
    const doubled = [
      "// @hella:styles",
      "// @hella:end",
      "// @hella:styles",
      "// @hella:end",
      "// @hella:compose",
      "[base]",
      "// @hella:end",
    ].join("\n");
    expect(() => applyStyleVariant(doubled, cssModule, "css")).toThrow(
      "[ui] applyStyleVariant: duplicate @hella:styles region",
    );
  });

  test("repeated compose regions splice once per region", () => {
    const multi = [
      "// @hella:styles",
      "// @hella:end",
      "",
      "export function A() {",
      "  return <p class={",
      "    // @hella:compose",
      "    [base, a.class]",
      "    // @hella:end",
      "  }>...</p>;",
      "}",
      "",
      "export function B() {",
      "  return <i class={",
      "    // @hella:compose",
      "    [base, b.class]",
      "    // @hella:end",
      "  }>...</i>;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(multi, cssModule, "css");
    expect(out).toContain("[base, a.class]");
    expect(out).toContain("[base, b.class]");
    expect(out.includes("@hella:")).toBe(false);
  });

  test("a canonical missing its compose region throws", () => {
    const stylesOnly = "// @hella:styles\n// @hella:end\n";
    expect(() => applyStyleVariant(stylesOnly, cssModule, "css")).toThrow(
      "[ui] applyStyleVariant: canonical is missing its @hella:compose region",
    );
  });

  test("a canonical missing a required region throws", () => {
    const composeOnly = "// @hella:compose\n[base]\n// @hella:end\n";
    expect(() => applyStyleVariant(composeOnly, cssModule, "css")).toThrow(
      "[ui] applyStyleVariant: canonical is missing its @hella:styles region",
    );
  });

  test("a style module importing the theme sheet rewrites to the components-dir sibling", () => {
    const themeModule = [
      'import { style } from "@hellajs/css";',
      'import { tokens } from "../theme/tokens.js";',
      "",
      'export const base = style("x", { color: tokens.foreground });',
      "",
    ].join("\n");
    const out = applyStyleVariant(canonical, themeModule, "css");
    expect(out).toContain('import { tokens } from "./tokens.js";');
    expect(out).not.toContain("../theme/tokens.js");
    expect(out).toContain('const base = style("x", { color: tokens.foreground });');
  });

  test("a compose region that is not a plain array throws on the tailwind wrap", () => {
    const notArray = [
      "// @hella:styles",
      "// @hella:end",
      "// @hella:compose",
      "base",
      "// @hella:end",
    ].join("\n");
    expect(() => applyStyleVariant(notArray, tailwindModule, "tailwind")).toThrow(
      '[ui] applyStyleVariant: compose region must be a plain class array (no "[" found)',
    );
  });

  test("a compose region without a closing bracket throws on the tailwind wrap", () => {
    const unclosed = [
      "// @hella:styles",
      "// @hella:end",
      "// @hella:compose",
      "[base",
      "// @hella:end",
    ].join("\n");
    expect(() => applyStyleVariant(unclosed, tailwindModule, "tailwind")).toThrow(
      '[ui] applyStyleVariant: compose region must be a plain class array (no "]" found)',
    );
  });

  test("leading whitespace on marker lines is tolerated", () => {
    const indented = [
      "// @hella:styles",
      "// @hella:end",
      "function X() {",
      "  return <p class={",
      "    // @hella:compose",
      "    [base]",
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    expect(applyStyleVariant(indented, tailwindModule, "tailwind")).toBe(
      [
        'import { cn } from "./cn.js";',
        "function X() {",
        "  return <p class={",
        '    cn("x-base")',
        "  }></p>;",
        "}",
      ].join("\n"),
    );
  });

  test("tailwind pass keeps a string const whose name binds a local outside the marker regions", () => {
    const shadowed = [
      'import { helper } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function X(p: P) {",
      '  const base = p.class ?? "";',
      "  return <p class={",
      "    // @hella:compose",
      "    [",
      "      base,",
      "      p.class,",
      "    ]",
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(shadowed, tailwindModule, "tailwind");
    expect(out).toContain('const base = "x-base";');
    expect(out).toContain("      base,");
    expect(out).toContain('const base = p.class ?? "";');
  });

  test("a comment mentioning the const name stays verbatim while the const inlines", () => {
    const commented = [
      'import type { HTMLAttributes } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "// The base class resolves through cn below.",
      "interface P { class?: string }",
      "",
      "export default function X(p: P) {",
      "  return <p class={",
      "    // @hella:compose",
      "    [base, p.class]",
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(commented, tailwindModule, "tailwind");
    expect(out).toContain("// The base class resolves through cn below.");
    expect(out).toContain('cn("x-base", p.class)');
    expect(out.includes("const base")).toBe(false);
  });

  test("an interface member sharing the const name stays verbatim while the const inlines", () => {
    const propTyped = [
      'import type { HTMLAttributes } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "interface P {",
      "  base?: string;",
      "  class?: string;",
      "}",
      "",
      "export default function X(p: P) {",
      "  return <p class={",
      "    // @hella:compose",
      "    [base, p.class]",
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(propTyped, tailwindModule, "tailwind");
    expect(out).toContain("  base?: string;");
    expect(out).toContain('cn("x-base", p.class)');
    expect(out.includes("const base")).toBe(false);
  });

  test("a JSX tag sharing the const name stays verbatim while the const inlines", () => {
    const tagged = [
      'import type { HTMLAttributes } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function X(p: P) {",
      "  return <base class={",
      "    // @hella:compose",
      "    [base, p.class]",
      "    // @hella:end",
      "  }></base>;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(tagged, tailwindModule, "tailwind");
    expect(out).toContain("<base class={");
    expect(out).toContain("</base>");
    expect(out).toContain('cn("x-base", p.class)');
    expect(out.includes("const base")).toBe(false);
  });

  test("string content sharing the const name stays verbatim while the const inlines", () => {
    const quoted = [
      'import type { HTMLAttributes } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function X(p: P) {",
      '  const label = "the base class";',
      "  return <p title={label} class={",
      "    // @hella:compose",
      "    [base, p.class]",
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(quoted, tailwindModule, "tailwind");
    expect(out).toContain("title={label}");
    expect(out).toContain('cn("x-base", p.class)');
    expect(out.includes("const base")).toBe(false);
  });

  test("an import line sharing the const name stays verbatim while the const inlines", () => {
    const imported = [
      'import { base } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function X(p: P) {",
      "  return <p class={",
      "    // @hella:compose",
      "    [base, p.class]",
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(imported, tailwindModule, "tailwind");
    expect(out).toContain('import { base } from "@hellajs/dom";');
    expect(out).toContain('cn("x-base", p.class)');
    expect(out.includes("const base")).toBe(false);
  });

  test("a printWidth-wrapped style-module import rides along verbatim", () => {
    const cssModule = [
      "import {",
      "  style,",
      '} from "@hellajs/css";',
      "",
      'export const base = style({}, { label: "x" });',
      "",
    ].join("\n");
    expect(applyStyleVariant(canonical, cssModule, "css")).toBe(
      [
        'import type { HTMLAttributes } from "@hellajs/dom";',
        "",
        "import {",
        "  style,",
        '} from "@hellajs/css";',
        "",
        'const base = style({}, { label: "x" });',
        "",
        "interface P { class?: string }",
        "",
        "export default function X(p: P) {",
        "  return <p class={",
        "    [",
        "      base,",
        "      p.class,",
        "    ]",
        "  }></p>;",
        "}",
      ].join("\n"),
    );
  });
});
