import { describe, expect, test } from "bun:test";
import { applyStyleVariant } from "@hellajs/ui/bundle";

const canonical = [
  "import { html } from \"@hellajs/dom\";",
  "",
  "// @hella:styles",
  "// @hella:end",
  "",
  "interface P { class?: string }",
  "",
  "export default function X(p: P) {",
  "  return html`<p class=\"${",
  "    // @hella:compose",
  "    [",
  "      base,",
  "      p.class,",
  "    ]",
  "    // @hella:end",
  "  }\"></p>`;",
  "}",
].join("\n");

const cssModule = [
  "import { style } from \"@hellajs/css\";",
  "",
  "export const base = style({}, { label: \"hella-x\", layer: \"hella\" });",
  "",
].join("\n");

const tailwindModule = [
  "export const base = \"x-base\";",
  "",
].join("\n");

describe("applyStyleVariant", () => {
  test("css pass splices the style module body and keeps the compose array verbatim", () => {
    expect(applyStyleVariant(canonical, cssModule, "css")).toBe([
      "import { html } from \"@hellajs/dom\";",
      "",
      "import { style } from \"@hellajs/css\";",
      "",
      "const base = style({}, { label: \"hella-x\", layer: \"hella\" });",
      "",
      "interface P { class?: string }",
      "",
      "export default function X(p: P) {",
      "  return html`<p class=\"${",
      "    [",
      "      base,",
      "      p.class,",
      "    ]",
      "  }\"></p>`;",
      "}",
    ].join("\n"));
  });

  test("tailwind pass wraps the compose array in cn, inlines string consts, and injects the cn import", () => {
    const out = applyStyleVariant(canonical, tailwindModule, "tailwind");
    expect(out).toBe([
      "import { html } from \"@hellajs/dom\";",
      "import { cn } from \"./cn.js\";",
      "",
      "interface P { class?: string }",
      "",
      "export default function X(p: P) {",
      "  return html`<p class=\"${",
      "    cn(",
      "      \"x-base\",",
      "      p.class,",
      "    )",
      "  }\"></p>`;",
      "}",
    ].join("\n"));
    expect(out.includes("const base")).toBe(false);
    expect(out.includes("@hella:")).toBe(false);
    expect(out.includes("@hellajs/css")).toBe(false);
  });

  test("single-line compose arrays wrap in place", () => {
    const single = [
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function X() {",
      "  return html`<p class=\"${",
      "    // @hella:compose",
      "    [base, p.class]",
      "    // @hella:end",
      "  }\"></p>`;",
      "}",
    ].join("\n");
    expect(applyStyleVariant(single, tailwindModule, "tailwind")).toContain("cn(\"x-base\", p.class)");
  });

  test("an unclosed section in the canonical throws", () => {
    const unbalanced = "// @hella:styles\nconst base = \"a\";\n";
    expect(() => applyStyleVariant(unbalanced, cssModule, "css"))
      .toThrow('[ui] applyStyleVariant: section "styles" is never closed with @hella:end');
  });

  test("an end marker without an open section throws", () => {
    const orphaned = "const base = \"a\";\n// @hella:end\n";
    expect(() => applyStyleVariant(orphaned, cssModule, "css"))
      .toThrow("[ui] applyStyleVariant: @hella:end without an open section");
  });

  test("a section opening inside another section throws", () => {
    const nested = "// @hella:styles\n// @hella:compose\nconst base = \"a\";\n// @hella:end\n";
    expect(() => applyStyleVariant(nested, cssModule, "css"))
      .toThrow('[ui] applyStyleVariant: section "styles" is still open when section "compose" opens');
  });

  test("an unknown marker line throws instead of shipping as a comment", () => {
    const legacy = "// @hella:imports\nimport { style } from \"@hellajs/css\";\n// @hella:end\n";
    expect(() => applyStyleVariant(legacy, cssModule, "css"))
      .toThrow('[ui] applyStyleVariant: unknown marker "// @hella:imports"');
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
    expect(() => applyStyleVariant(doubled, cssModule, "css"))
      .toThrow("[ui] applyStyleVariant: duplicate @hella:styles region");
  });

  test("repeated compose regions splice once per region", () => {
    const multi = [
      "// @hella:styles",
      "// @hella:end",
      "",
      "export function A() {",
      "  return html`<p class=\"${",
      "    // @hella:compose",
      "    [base, a.class]",
      "    // @hella:end",
      "  }\">...</p>`;",
      "}",
      "",
      "export function B() {",
      "  return html`<i class=\"${",
      "    // @hella:compose",
      "    [base, b.class]",
      "    // @hella:end",
      "  }\">...</i>`;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(multi, cssModule, "css");
    expect(out).toContain("[base, a.class]");
    expect(out).toContain("[base, b.class]");
    expect(out.includes("@hella:")).toBe(false);
  });

  test("a two-region tailwind pass wraps both arrays in cn and injects exactly one cn import", () => {
    const multi = [
      "// @hella:styles",
      "// @hella:end",
      "",
      "export function A() {",
      "  return html`<p class=\"${",
      "    // @hella:compose",
      "    [base, a.class]",
      "    // @hella:end",
      "  }\">...</p>`;",
      "}",
      "",
      "export function B() {",
      "  return html`<i class=\"${",
      "    // @hella:compose",
      "    [base, b.class]",
      "    // @hella:end",
      "  }\">...</i>`;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(multi, tailwindModule, "tailwind");
    expect(out).toContain("cn(\"x-base\", a.class)");
    expect(out).toContain("cn(\"x-base\", b.class)");
    expect(out.split('import { cn } from "./cn.js";').length - 1).toBe(1);
  });

  test("a canonical missing its compose region throws", () => {
    const stylesOnly = "// @hella:styles\n// @hella:end\n";
    expect(() => applyStyleVariant(stylesOnly, cssModule, "css"))
      .toThrow("[ui] applyStyleVariant: canonical is missing its @hella:compose region");
  });

  test("a canonical missing a required region throws", () => {
    const composeOnly = "// @hella:compose\n[base]\n// @hella:end\n";
    expect(() => applyStyleVariant(composeOnly, cssModule, "css"))
      .toThrow("[ui] applyStyleVariant: canonical is missing its @hella:styles region");
  });

  test("a style module with a relative import throws", () => {
    const relative = "import { cn } from \"../cn/cn\";\n\nexport const base = \"a\";\n";
    expect(() => applyStyleVariant(canonical, relative, "tailwind"))
      .toThrow('[ui] applyStyleVariant: style module imports must use package specifiers, got "../cn/cn"');
  });

  test("a style module import without a double-quoted specifier throws", () => {
    const singleQuoted = "import { base } from 'some-pkg';\n";
    expect(() => applyStyleVariant(canonical, singleQuoted, "css"))
      .toThrow('[ui] applyStyleVariant: style module import has no specifier: "import { base } from \'some-pkg\';"');
  });

  test("a style module exporting through default or braces throws", () => {
    const defaulted = "export default \"a\";\n";
    expect(() => applyStyleVariant(canonical, defaulted, "css"))
      .toThrow('[ui] applyStyleVariant: style module cannot use "export default "a";"');
  });

  test("a compose region that is not a plain array throws on the tailwind wrap", () => {
    const notArray = [
      "// @hella:styles",
      "// @hella:end",
      "// @hella:compose",
      "base",
      "// @hella:end",
    ].join("\n");
    expect(() => applyStyleVariant(notArray, tailwindModule, "tailwind"))
      .toThrow('[ui] applyStyleVariant: compose region must be a plain class array (no "[" found)');
  });

  test("a compose region without a closing bracket throws on the tailwind wrap", () => {
    const unclosed = [
      "// @hella:styles",
      "// @hella:end",
      "// @hella:compose",
      "[base",
      "// @hella:end",
    ].join("\n");
    expect(() => applyStyleVariant(unclosed, tailwindModule, "tailwind"))
      .toThrow('[ui] applyStyleVariant: compose region must be a plain class array (no "]" found)');
  });

  test("an empty compose region throws on the tailwind wrap", () => {
    const empty = [
      "// @hella:styles",
      "// @hella:end",
      "// @hella:compose",
      "// @hella:end",
    ].join("\n");
    expect(() => applyStyleVariant(empty, tailwindModule, "tailwind"))
      .toThrow("[ui] applyStyleVariant: compose region is empty");
  });

  test("leading whitespace on marker lines is tolerated", () => {
    const indented = [
      "// @hella:styles",
      "// @hella:end",
      "function X() {",
      "  return html`<p class=\"${",
      "    // @hella:compose",
      "    [base]",
      "    // @hella:end",
      "  }\"></p>`;",
      "}",
    ].join("\n");
    expect(applyStyleVariant(indented, tailwindModule, "tailwind")).toBe([
      "import { cn } from \"./cn.js\";",
      "function X() {",
      "  return html`<p class=\"${",
      "    cn(\"x-base\")",
      "  }\"></p>`;",
      "}",
    ].join("\n"));
  });

  test("tailwind pass keeps an object map in styles while inlining its string sibling", () => {
    const mixedModule = [
      "export const base = \"x-base\";",
      "",
      "export const variants = {",
      "  default: \"x-default\",",
      "};",
      "",
    ].join("\n");
    const lookup = [
      "import { html } from \"@hellajs/dom\";",
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "export default function X(p: P) {",
      "  return html`<p class=\"${",
      "    // @hella:compose",
      "    [",
      "      base,",
      "      variants[props.variant ?? \"default\"],",
      "      p.class,",
      "    ]",
      "    // @hella:end",
      "  }\"></p>`;",
      "}",
    ].join("\n");
    expect(applyStyleVariant(lookup, mixedModule, "tailwind")).toBe([
      "import { html } from \"@hellajs/dom\";",
      "import { cn } from \"./cn.js\";",
      "",
      "const variants = {",
      "  default: \"x-default\",",
      "};",
      "",
      "export default function X(p: P) {",
      "  return html`<p class=\"${",
      "    cn(",
      "      \"x-base\",",
      "      variants[props.variant ?? \"default\"],",
      "      p.class,",
      "    )",
      "  }\"></p>`;",
      "}",
    ].join("\n"));
  });

  test("tailwind pass keeps a string const referenced outside the marker regions", () => {
    const referencing = [
      "import { helper } from \"@hellajs/dom\";",
      "",
      "// @hella:styles",
      "// @hella:end",
      "",
      "const wrapper = (cls: string) => helper(base, cls);",
      "",
      "export default function X(p: P) {",
      "  return html`<p class=\"${",
      "    // @hella:compose",
      "    [",
      "      base,",
      "      p.class,",
      "    ]",
      "    // @hella:end",
      "  }\"></p>`;",
      "}",
    ].join("\n");
    expect(applyStyleVariant(referencing, tailwindModule, "tailwind")).toBe([
      "import { helper } from \"@hellajs/dom\";",
      "import { cn } from \"./cn.js\";",
      "",
      "const base = \"x-base\";",
      "",
      "const wrapper = (cls: string) => helper(base, cls);",
      "",
      "export default function X(p: P) {",
      "  return html`<p class=\"${",
      "    cn(",
      "      base,",
      "      p.class,",
      "    )",
      "  }\"></p>`;",
      "}",
    ].join("\n"));
  });

  test("a string-only module leaves no styles residue or blank-line runs", () => {
    const multiRegion = [
      "// @hella:styles",
      "// @hella:end",
      "",
      "export function A() {",
      "  return html`<p class=\"${",
      "    // @hella:compose",
      "    [base, a.class]",
      "    // @hella:end",
      "  }\">...</p>`;",
      "}",
      "",
      "export function B() {",
      "  return html`<i class=\"${",
      "    // @hella:compose",
      "    [base, b.class]",
      "    // @hella:end",
      "  }\">...</i>`;",
      "}",
    ].join("\n");
    const out = applyStyleVariant(multiRegion, tailwindModule, "tailwind");
    expect(out.includes("const ")).toBe(false);
    expect(/\n{3,}/.test(out)).toBe(false);
  });

  test("a comment above a dropped string const drops with it and a comment above a kept map stays", () => {
    const documented = [
      "/** Base classes. */",
      "export const base = \"x-base\";",
      "",
      "/** Variant map. */",
      "export const variants = {",
      "  default: \"x-default\",",
      "};",
      "",
    ].join("\n");
    expect(applyStyleVariant(canonical, documented, "tailwind")).toBe([
      "import { html } from \"@hellajs/dom\";",
      "import { cn } from \"./cn.js\";",
      "",
      "/** Variant map. */",
      "const variants = {",
      "  default: \"x-default\",",
      "};",
      "",
      "interface P { class?: string }",
      "",
      "export default function X(p: P) {",
      "  return html`<p class=\"${",
      "    cn(",
      "      \"x-base\",",
      "      p.class,",
      "    )",
      "  }\"></p>`;",
      "}",
    ].join("\n"));
  });
});
