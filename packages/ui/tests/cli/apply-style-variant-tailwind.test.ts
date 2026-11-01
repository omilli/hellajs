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

const tailwindModule = ['export const base = "x-base";', ""].join("\n");

describe("applyStyleVariant", () => {
  test("tailwind pass wraps the compose array in cn, inlines string consts, and injects the cn import", () => {
    const out = applyStyleVariant(canonical, tailwindModule, "tailwind");
    expect(out).toBe(
      [
        'import type { HTMLAttributes } from "@hellajs/dom";',
        'import { cn } from "./cn.js";',
        "",
        "interface P { class?: string }",
        "",
        "export default function X(p: P) {",
        "  return <p class={",
        "    cn(",
        '      "x-base",',
        "      p.class,",
        "    )",
        "  }></p>;",
        "}",
      ].join("\n"),
    );
    expect(out.includes("const base")).toBe(false);
    expect(out.includes("@hella:")).toBe(false);
    expect(out.includes("@hellajs/css")).toBe(false);
  });

  test("a two-region tailwind pass wraps both arrays in cn and injects exactly one cn import", () => {
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
    const out = applyStyleVariant(multi, tailwindModule, "tailwind");
    expect(out).toContain('cn("x-base", a.class)');
    expect(out).toContain('cn("x-base", b.class)');
    expect(out.split('import { cn } from "./cn.js";').length - 1).toBe(1);
  });

  test("a style module with a relative import throws", () => {
    const relative = 'import { cn } from "../cn/cn";\n\nexport const base = "a";\n';
    expect(() => applyStyleVariant(canonical, relative, "tailwind")).toThrow(
      '[ui] applyStyleVariant: style module imports must use package specifiers, got "../cn/cn"',
    );
  });

  test("a style module importing a non-theme relative sibling still throws", () => {
    const sibling = [
      'import { style } from "@hellajs/css";',
      'import { tokens } from "./sibling.ts";',
      "",
      'export const base = style("x", { color: tokens.foreground });',
      "",
    ].join("\n");
    expect(() => applyStyleVariant(canonical, sibling, "css")).toThrow(
      '[ui] applyStyleVariant: style module imports must use package specifiers, got "./sibling.ts"',
    );
  });

  test("a style module import without a double-quoted specifier throws", () => {
    const singleQuoted = "import { base } from 'some-pkg';\n";
    expect(() => applyStyleVariant(canonical, singleQuoted, "css")).toThrow(
      "[ui] applyStyleVariant: style module import has no specifier: \"import { base } from 'some-pkg';\"",
    );
  });

  test("a style module exporting through default or braces throws", () => {
    const defaulted = 'export default "a";\n';
    expect(() => applyStyleVariant(canonical, defaulted, "css")).toThrow(
      '[ui] applyStyleVariant: style module cannot use "export default "a";"',
    );
  });

  test("an empty compose region throws on the tailwind wrap", () => {
    const empty = ["// @hella:styles", "// @hella:end", "// @hella:compose", "// @hella:end"].join(
      "\n",
    );
    expect(() => applyStyleVariant(empty, tailwindModule, "tailwind")).toThrow(
      "[ui] applyStyleVariant: compose region is empty",
    );
  });

  test("tailwind pass keeps an object map in styles while inlining its string sibling", () => {
    const mixedModule = [
      'export const base = "x-base";',
      "",
      "export const variants = {",
      '  default: "x-default",',
      "};",
      "",
    ].join("\n");
    const lookup = [
      'import type { HTMLAttributes } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function X(p: P) {",
      "  return <p class={",
      "    // @hella:compose",
      "    [",
      "      base,",
      '      variants[props.variant ?? "default"],',
      "      p.class,",
      "    ]",
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    expect(applyStyleVariant(lookup, mixedModule, "tailwind")).toBe(
      [
        'import type { HTMLAttributes } from "@hellajs/dom";',
        'import { cn } from "./cn.js";',
        "",
        "const variants = {",
        '  default: "x-default",',
        "};",
        "",
        "export default function X(p: P) {",
        "  return <p class={",
        "    cn(",
        '      "x-base",',
        '      variants[props.variant ?? "default"],',
        "      p.class,",
        "    )",
        "  }></p>;",
        "}",
      ].join("\n"),
    );
  });

  test("tailwind pass inlines a string const referenced outside the marker regions", () => {
    const referencing = [
      'import { helper } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "const wrapper = (cls: string) => helper(base, cls);",
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
    expect(applyStyleVariant(referencing, tailwindModule, "tailwind")).toBe(
      [
        'import { helper } from "@hellajs/dom";',
        'import { cn } from "./cn.js";',
        "",
        'const wrapper = (cls: string) => helper("x-base", cls);',
        "",
        "export default function X(p: P) {",
        "  return <p class={",
        "    cn(",
        '      "x-base",',
        "      p.class,",
        "    )",
        "  }></p>;",
        "}",
      ].join("\n"),
    );
  });

  test("a static class attribute collapses to the literal", () => {
    const jsxAttr = [
      'import type { HellaChildren } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "interface P { children?: HellaChildren }",
      "",
      "export default function X(p: P) {",
      "  return (",
      "    <>",
      "      <span class={",
      "        // @hella:compose",
      "        [srOnly, p.class]",
      "        // @hella:end",
      "      }>{p.children}</span>",
      "      <span class={srOnly}>{p.children}</span>",
      "    </>",
      "  );",
      "}",
    ].join("\n");
    const srModule = ['export const srOnly = "sr-only";', ""].join("\n");
    const jsxOut = applyStyleVariant(jsxAttr, srModule, "tailwind");
    expect(jsxOut).toContain('<span class="sr-only">');
    expect(jsxOut.includes("srOnly")).toBe(false);
  });

  test("a canonical-level runtime constant inlines at its references and drops with its comment", () => {
    const runtime = [
      'import type { HTMLAttributes } from "@hellajs/dom";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "/** Document-level activation event. */",
      'const ACTIVATE_EVENT = "x:activate";',
      "",
      "export function fire() {",
      "  dispatch(new CustomEvent(ACTIVATE_EVENT, { detail: true }));",
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
    const out = applyStyleVariant(runtime, tailwindModule, "tailwind");
    expect(out).toContain('new CustomEvent("x:activate", { detail: true })');
    expect(out.includes("ACTIVATE_EVENT")).toBe(false);
    expect(out.includes("Document-level activation event")).toBe(false);
    expect(out).toContain('cn("x-base", p.class)');
  });

  test("a string-only module leaves no styles residue or blank-line runs", () => {
    const multiRegion = [
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
    const out = applyStyleVariant(multiRegion, tailwindModule, "tailwind");
    expect(out.includes("const ")).toBe(false);
    expect(/\n{3,}/.test(out)).toBe(false);
  });

  test("a comment above a dropped string const drops with it and a comment above a kept map stays", () => {
    const documented = [
      "/** Base classes. */",
      'export const base = "x-base";',
      "",
      "/** Variant map. */",
      "export const variants = {",
      '  default: "x-default",',
      "};",
      "",
    ].join("\n");
    expect(applyStyleVariant(canonical, documented, "tailwind")).toBe(
      [
        'import type { HTMLAttributes } from "@hellajs/dom";',
        'import { cn } from "./cn.js";',
        "",
        "/** Variant map. */",
        "const variants = {",
        '  default: "x-default",',
        "};",
        "",
        "interface P { class?: string }",
        "",
        "export default function X(p: P) {",
        "  return <p class={",
        "    cn(",
        '      "x-base",',
        "      p.class,",
        "    )",
        "  }></p>;",
        "}",
      ].join("\n"),
    );
  });

  test("the cn import injects after a wrapped last import statement", () => {
    const source = [
      "import type {",
      "  WidgetProps,",
      '} from "./widget-types.js";',
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function W(props: WidgetProps) {",
      "  return <p class={",
      "    // @hella:compose",
      '    ["y-class"],',
      "    // @hella:end",
      "  }></p>;",
      "}",
    ].join("\n");
    expect(applyStyleVariant(source, tailwindModule, "tailwind")).toBe(
      [
        "import type {",
        "  WidgetProps,",
        '} from "./widget-types.js";',
        'import { cn } from "./cn.js";',
        "",
        "export default function W(props: WidgetProps) {",
        "  return <p class={",
        '    cn("y-class"),',
        "  }></p>;",
        "}",
      ].join("\n"),
    );
  });

  test("a wrapped import continuation line sharing an inlineable name stays verbatim while the const inlines", () => {
    const source = [
      "import {",
      "  base,",
      '} from "@hellajs/css";',
      "",
      "// @hella:styles",
      "// @hella:end",
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
    expect(applyStyleVariant(source, tailwindModule, "tailwind")).toBe(
      [
        "import {",
        "  base,",
        '} from "@hellajs/css";',
        'import { cn } from "./cn.js";',
        "",
        "export default function X(p: P) {",
        "  return <p class={",
        "    cn(",
        '      "x-base",',
        "      p.class,",
        "    )",
        "  }></p>;",
        "}",
      ].join("\n"),
    );
  });
});
