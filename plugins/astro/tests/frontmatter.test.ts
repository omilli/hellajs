import { describe, test, expect } from "bun:test";
import { frontmatterCss } from "../frontmatter.mjs";

interface Batch {
  code: string | null;
  css: string | null;
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
 * Runs the plugin transform against compiled source and resolves the batch's
 * virtual CSS through the plugin's own load hook.
 */
function run(code: string, opts: { id?: string; resolve?: Resolve; load?: Load } = {}): Batch {
  const plugin = frontmatterCss({ resolve: opts.resolve, load: opts.load }) as unknown as PluginUnderTest;
  const watched: string[] = [];
  const context = { addWatchFile: (file: string) => { watched.push(file); } };
  const result = plugin.transform.call(context, code, opts.id ?? "/src/pages/index.astro");
  if (result === null) return { code: null, css: null, watched };
  const virtual = /import "virtual:hella-frontmatter\/([^"]+)\.css";/.exec(result.code);
  expect(virtual).not.toBeNull();
  return { code: result.code, css: plugin.load.call({}, `\0virtual:hella-frontmatter/${virtual![1]}.css`), watched };
}

describe("frontmatter extraction", () => {
  test("folds a literal style() call to its class literal and collects the scoped rule", () => {
    const { code, css } = run(compiled(
      [`import { style } from "@hellajs/css";`],
      `  const card = style({ padding: "1rem", "&:hover": { color: "red" } });`,
      "<div class=${card}></div>",
    ));
    expect(code).toContain(`const card = "h-`);
    expect(css).toContain("padding:1rem");
    expect(css).toContain(":hover{color:red}");
  });

  test("folds a css() call to void 0 and collects the global rule", () => {
    const { code, css } = run(compiled(
      [`import { css } from "@hellajs/css";`],
      `  css({ ".prose a": { textDecoration: "underline" } });`,
      "<main></main>",
    ));
    expect(code).toContain("void 0");
    expect(css).toContain(".prose a{text-decoration:underline}");
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
    expect(code).toContain(`const spin = "h-kf-`);
    expect(css).toMatch(/@keyframes h-kf-[a-z0-9]+\{from\{opacity:0\}to\{opacity:1\}\}/);
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
    expect(code).toMatch(/const merged = "h-[a-z0-9]+"/);
    expect(code).toMatch(/const composed = "btn h-[a-z0-9]+"/);
    expect(code).toMatch(/const labeled = "h-card-[a-z0-9]+"/);
    expect(css).toContain("font-size:14px;color:blue");
    expect(css).toMatch(/\.h-[a-z0-9]+\{color:red\}/);
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
    const { code, css, watched } = run(compiled(
      [`import { style } from "@hellajs/css";`, `import { base, spin } from "../theme";`],
      "  const hero = style(base, { animation: `${spin} 1s linear` });",
      "<div></div>",
    ), { resolve, load });
    expect(code).toMatch(/const hero = "h-[a-z0-9]+"/);
    expect(css).toContain("font-size:14px");
    expect(css).toMatch(/animation:h-kf-[a-z0-9]+ 1s linear/);
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
    expect(code).toMatch(/const mixed = "a b h-[a-z0-9]+"/);
    expect(code).toMatch(/const variant = "h-base-[a-z0-9]+ h-size-sm-[a-z0-9]+ h-[a-z0-9]+"/);
  });

  test("collects imported top-level creator calls and ignores their non-foldable calls and vars()", () => {
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
    const { css } = run(compiled(
      [`import { style } from "@hellajs/css";`, `import "../island-styles";`],
      `  const own = style({ color: "blue" });`,
      "<div></div>",
    ), { resolve, load });
    expect(css).toContain(".imported-rule{color:green}");
    expect(css).not.toContain("--brand");
    expect(css).not.toContain("nope");
  });

  test("collects styles through a TSX island component in the import graph", () => {
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
    const { css, watched } = run(compiled(
      [`import { css } from "@hellajs/css";`, `import Counter from "../components/Counter";`],
      `  css({ body: { margin: "2rem auto" } });`,
      "<Counter client:load initial={0} />",
    ), { resolve, load });
    expect(css).toContain("padding:0.5rem");
    expect(css).toMatch(/\.h-counter-btn-[a-z0-9]+/);
    expect(css).toContain("margin:2rem auto");
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
    const { code, css } = run(compiled(
      [`import { style } from "@hellajs/css";`],
      ``,
      "<div class=${style({ margin: 0 })}></div>",
    ));
    expect(code).toMatch(/\$\{"h-[a-z0-9]+"\}/);
    expect(css).toContain("margin:0");
  });
});
