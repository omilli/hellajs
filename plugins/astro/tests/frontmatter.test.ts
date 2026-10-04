import { describe, test, expect } from "bun:test";
import { parse } from "@babel/parser";
import { frontmatterCss } from "../frontmatter.mjs";

interface Batch {
  code: string | null;
  css: string | null;
  island: string | null;
  watched: string[];
}

interface PluginUnderTest {
  transform: (this: { addWatchFile: (file: string) => void }, code: string, id: string) => { code: string } | null;
  load: (this: unknown, id: string) => string | null;
}

type Resolve = (specifier: string, importer: string) => string | null;
type Load = (id: string) => string;

/**
 * Wraps frontmatter statements into the shape Astro's compiler emits:
 * imports hoisted to module top, statements inside the `$$createComponent`
 * arrow, template expressions inside `$$render`.
 */
function compiled(imports: string[], frontmatter: string, template: string): string {
  return `${imports.join("\n")}
const $$Page = $$createComponent(($$result, $$props, $$slots) => {
${frontmatter}
  return $$render\`${template}\`;
}, "page.astro", undefined);
export default $$Page;`;
}

/**
 * Runs the plugin transform against compiled source, resolves the batch's
 * virtual CSS through the plugin's own load hook, and extracts the spliced
 * island style tag from the transformed code.
 */
function run(code: string, opts: { id?: string; resolve?: Resolve; load?: Load } = {}): Batch {
  const plugin = frontmatterCss({ resolve: opts.resolve, load: opts.load }) as unknown as PluginUnderTest;
  const watched: string[] = [];
  const context = { addWatchFile: (file: string) => { watched.push(file); } };
  const result = plugin.transform.call(context, code, opts.id ?? "/src/pages/index.astro");
  if (result === null) return { code: null, css: null, island: null, watched };
  const virtual = /import "virtual:hella-frontmatter\/([^"]+)\.css";/.exec(result.code);
  expect(virtual).not.toBeNull();
  const tag = /<style id="hella-css">([\s\S]*?)<\/style>/.exec(result.code);
  return { code: result.code, css: plugin.load.call({}, `\0virtual:hella-frontmatter/${virtual![1]}.css`), island: tag?.[1] ?? null, watched };
}

describe("frontmatter extraction", () => {
  test("folds a literal style() call to its class literal and collects the scoped rule", () => {
    const { code, css, island } = run(compiled(
      [`import { style } from "@hellajs/css";`],
      `  const card = style({ padding: "1rem", "&:hover": { color: "red" } });`,
      "<div class=${card}></div>",
    ));
    expect(code).toMatch(/const card = "[a-z]+"/);
    expect(css).toMatch(/\.[a-z]+ \{\n {2}padding: 1rem;\n\}/);
    expect(css).toMatch(/:hover \{\n {2}color: red;\n\}/);
    expect(island).toBeNull();
  });

  test("folds a css() call to void 0 and collects the global rule", () => {
    const { code, css } = run(compiled(
      [`import { css } from "@hellajs/css";`],
      `  css({ ".prose a": { textDecoration: "underline" } });`,
      "<main></main>",
    ));
    expect(code).toContain("void 0");
    expect(css).toContain(".prose a {\n  text-decoration: underline;\n}");
  });

  test("folds a keyframes() call to its name literal and collects the rule", () => {
    const { code, css } = run(compiled(
      [`import { keyframes } from "@hellajs/css";`],
      [
        `  const spin = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });`,
        "  const anim = `${spin} 1s linear`;",
      ].join("\n"),
      "<div></div>",
    ));
    expect(code).toContain(`const spin = "kf-`);
    expect(css).toMatch(/@keyframes kf-[a-z]+ \{\n {2}from \{\n {4}opacity: 0;\n {2}\}\n {2}to \{\n {4}opacity: 1;\n {2}\}\n\}/);
  });

  test("folds same-module const bindings: object merge, string base, and options bag", () => {
    const { code, css } = run(compiled(
      [`import { style } from "@hellajs/css";`],
      [
        `  const base = { fontSize: "14px" };`,
        `  const merged = style(base, { color: "blue" });`,
        `  const composed = style("btn", { color: "red" });`,
        `  const labeled = style({ margin: 0 }, { label: "card" });`,
      ].join("\n"),
      "<div></div>",
    ));
    expect(code).toMatch(/const merged = "[a-z]+"/);
    expect(code).toMatch(/const composed = "btn [a-z]+"/);
    expect(code).toMatch(/const labeled = "card-[a-z]+"/);
    expect(css).toMatch(/\.[a-z]+ \{\n {2}font-size: 14px;\n {2}color: blue;\n\}/);
    expect(css).toMatch(/\.[a-z]+ \{\n {2}color: red;\n\}/);
  });

  test("folds imports through a stubbed resolver: const objects and composed keyframes names", () => {
    const files = new Map<string, string>([
      ["/src/theme.ts", [
        `import { keyframes } from "@hellajs/css";`,
        `export const base = { fontSize: "14px" };`,
        `export const spin = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });`,
      ].join("\n")],
    ]);
    const resolve: Resolve = (specifier) => (specifier === "../theme" ? "/src/theme.ts" : null);
    const load: Load = (id) => files.get(id) ?? "";
    const { code, css, island, watched } = run(compiled(
      [`import { style } from "@hellajs/css";`, `import { base, spin } from "../theme";`],
      "  const hero = style(base, { animation: `${spin} 1s linear` });",
      "<div></div>",
    ), { resolve, load });
    expect(code).toMatch(/const hero = "[a-z]+"/);
    expect(island).toContain("@keyframes kf-");
    expect(css).toContain("font-size: 14px");
    expect(css).toMatch(/animation: kf-[a-z]+ 1s linear/);
    expect(watched).toContain("/src/theme.ts");
  });

  test("folds cx() composition and a cva recipe call to their string results", () => {
    const { code } = run(compiled(
      [`import { style, cx, cva } from "@hellajs/css";`],
      [
        `  const btn = cva({ base: { padding: "4px" }, variants: { size: { sm: { padding: "2px" } } } });`,
        `  const mixed = style(cx("a", { b: true }), { color: "blue" });`,
        `  const variant = style(btn({ size: "sm" }), { color: "red" });`,
      ].join("\n"),
      "<div></div>",
    ));
    expect(code).toMatch(/const mixed = "a b [a-z]+"/);
    expect(code).toMatch(/const variant = "base-[a-z]+ size-sm-[a-z]+ [a-z]+"/);
  });

  test("collects imported top-level creator calls into the island tag and ignores their non-foldable calls and vars()", () => {
    const files = new Map<string, string>([
      ["/src/island-styles.ts", [
        `import { css, style, vars } from "@hellajs/css";`,
        `css({ ".imported-rule": { color: "green" } });`,
        `const first = (fn: unknown) => fn;`,
        `style({ color: first("nope") });`,
        `vars({ brand: "hotpink" });`,
      ].join("\n")],
    ]);
    const resolve: Resolve = (specifier) => (specifier === "../island-styles" ? "/src/island-styles.ts" : null);
    const load: Load = (id) => files.get(id) ?? "";
    const { css, island } = run(compiled(
      [`import { style } from "@hellajs/css";`, `import "../island-styles";`],
      `  const own = style({ color: "blue" });`,
      "<div></div>",
    ), { resolve, load });
    expect(island).toContain(".imported-rule {");
    expect(island).toContain("color: green;");
    expect(island).not.toContain("--brand");
    expect(island).not.toContain("nope");
    expect(css).not.toContain(".imported-rule");
  });

  test("collects TSX island component styles into the island tag and frontmatter rules into the virtual css", () => {
    const files = new Map<string, string>([
      ["/src/components/Counter.tsx", [
        `import { signal } from "@hellajs/core";`,
        `import { counterBtn } from "../theme";`,
        `export default function Counter({ initial = 0 }: { initial?: number }) {`,
        `  const count = signal(initial);`,
        `  return <button class={counterBtn} on:click={() => count(count() + 1)}>{count()}</button>;`,
        `}`,
      ].join("\n")],
      ["/src/theme.ts", [
        `import { style } from "@hellajs/css";`,
        `export const counterBtn = style({ padding: "0.5rem" }, { label: "counter-btn" });`,
      ].join("\n")],
    ]);
    const resolve: Resolve = (specifier) =>
      specifier === "../components/Counter" ? "/src/components/Counter.tsx"
      : specifier === "../theme" ? "/src/theme.ts"
      : null;
    const load: Load = (id) => files.get(id) ?? "";
    const { css, island, watched } = run(compiled(
      [`import { css } from "@hellajs/css";`, `import Counter from "../components/Counter";`],
      `  css({ body: { margin: "2rem auto" } });`,
      "<Counter client:load initial={0} />",
    ), { resolve, load });
    expect(island).toContain("padding: 0.5rem;");
    expect(island).toMatch(/\.counter-btn-[a-z]+/);
    expect(css).toContain("margin: 2rem auto;");
    expect(watched).toContain("/src/components/Counter.tsx");
    expect(watched).toContain("/src/theme.ts");
  });

  test("throws the escape-hatch message for non-foldable creator arguments", () => {
    expect(() => run(compiled(
      [`import { style } from "@hellajs/css";`],
      `  const make = (dark: string) => style({ color: dark });`,
      "<div></div>",
    ))).toThrow("requires statically evaluable arguments");
  });

  test("throws when vars() appears in the .astro module", () => {
    expect(() => run(compiled(
      [`import { vars } from "@hellajs/css";`],
      `  const theme = vars({ brand: "hotpink" });`,
      "<div></div>",
    ))).toThrow("vars()");
  });

  test("returns null for modules importing and referencing cssText", () => {
    const result = run(compiled(
      [`import { cssText, style } from "@hellajs/css";`],
      `  const card = style({ color: "blue" });`,
      "<style is:inline set:html=${cssText()}></style><div class=${card}></div>",
    ));
    expect(result.code).toBeNull();
    expect(result.css).toBeNull();
  });

  test("returns null for modules without creator calls", () => {
    const result = run(compiled(
      [`import { signal } from "@hellajs/core";`],
      `  const count = signal(0);`,
      "<div>${count()}</div>",
    ));
    expect(result.code).toBeNull();
  });

  test("extracts a template-expression creator call inside $$render", () => {
    const { code, css, island } = run(compiled(
      [`import { style } from "@hellajs/css";`],
      ``,
      "<div class=${style({ margin: 0 })}></div>",
    ));
    expect(code).toMatch(/\$\{"[a-z]+"\}/);
    expect(css).toContain("margin: 0px;");
    expect(island).toBeNull();
  });

  test.each([
    { label: "after the head open tag", template: "<html><head><title>t</title></head><body><div></div></body></html>", adjacent: '<head><style id="hella-css">' },
    { label: "after the body open tag", template: "<html><body><div></div></body></html>", adjacent: '<body><style id="hella-css">' },
    { label: "at the quasi start without head or body", template: "<div></div>", adjacent: '$$render`<style id="hella-css">' },
  ])("splices the island tag $label", ({ template, adjacent }) => {
    const files = new Map<string, string>([
      ["/src/island.ts", `import { style } from "@hellajs/css";\nstyle({ margin: 0 });`],
    ]);
    const resolve: Resolve = (specifier) => (specifier === "../island" ? "/src/island.ts" : null);
    const load: Load = (id) => files.get(id) ?? "";
    const { code, island } = run(compiled(
      [`import { style } from "@hellajs/css";`, `import "../island";`],
      `  const own = style({ color: "blue" });`,
      template,
    ), { resolve, load });
    expect(code).toContain(adjacent);
    expect(island).toContain("margin: 0px;");
    expect(island).not.toContain("color: blue");
  });

  test("escapes island css for the template literal and keeps the module parseable", () => {
    const files = new Map<string, string>([
      ["/src/island.ts", [
        `import { style } from "@hellajs/css";`,
        `style({ ".brk::after": { content: "'</style>'" }, ".tick::after": { content: "'\`'" } });`,
      ].join("\n")],
    ]);
    const resolve: Resolve = (specifier) => (specifier === "../island" ? "/src/island.ts" : null);
    const load: Load = (id) => files.get(id) ?? "";
    const { code, island } = run(compiled(
      [`import { style } from "@hellajs/css";`, `import "../island";`],
      `  const own = style({ color: "blue" });`,
      "<div></div>",
    ), { resolve, load });
    expect(island).toContain("<\\\\/style>");
    expect(island).toContain("\\`");
    expect(island).not.toContain("</style>");
    expect(() => parse(code!, { sourceType: "module" })).not.toThrow();
  });

  test("delivers island rules through the virtual import without a $$render template", () => {
    const files = new Map<string, string>([
      ["/src/island.ts", `import { style } from "@hellajs/css";\nstyle({ margin: 0 });`],
    ]);
    const resolve: Resolve = (specifier) => (specifier === "../island" ? "/src/island.ts" : null);
    const load: Load = (id) => files.get(id) ?? "";
    const { css, island } = run([
      `import { css } from "@hellajs/css";`,
      `import "../island";`,
      `const $$Page = $$createComponent(($$result) => {`,
      `  css({ body: { margin: "2rem auto" } });`,
      `});`,
      `export default $$Page;`,
    ].join("\n"), { resolve, load });
    expect(island).toBeNull();
    expect(css).toContain("margin: 2rem auto;");
    expect(css).toContain("margin: 0px;");
  });
});
