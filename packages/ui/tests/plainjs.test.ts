import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resetTestState } from "@utils/test-helpers.js";
import { addComponent, readConfig } from "@hellajs/ui/bundle";
import ButtonTsHtml from "../dist/registry/button/css/button-html";
import { transformSync } from "@babel/core";
import babelHellaJS from "babel-plugin-hellajs";
// @ts-expect-error @babel/preset-typescript ships no type declarations
import presetTypeScript from "@babel/preset-typescript";
import type { UiFormat, UiLang, UiStyle } from "@hellajs/ui";
import type { ButtonVariantProps, ComponentVariant } from "./helpers/variants";
import { renderVariant } from "./helpers/variants";
import { runCli } from "./helpers/cli";

const fixtureApp = join(import.meta.dir, "fixtures", "empty-app");
const scratch = join(import.meta.dir, ".tmp", "plainjs");
const tokensSource = readFileSync(join(import.meta.dir, "..", "registry", "theme", "tokens.js"), "utf8");

/** Fresh fixture copy under the scratch root; per-test names keep dynamic imports from colliding. */
function fixture(name: string): string {
  const root = join(scratch, name);
  rmSync(root, { recursive: true, force: true });
  cpSync(fixtureApp, root, { recursive: true });
  return root;
}

/** Components directory of a fixture root. */
function componentsDir(root: string): string {
  return join(root, "src", "components");
}

const COMBOS: { style: UiStyle; format: UiFormat }[] = [
  { style: "css", format: "jsx" },
  { style: "css", format: "html" },
  { style: "tailwind", format: "jsx" },
  { style: "tailwind", format: "html" },
];

/** The TS comparator for the parity test: the compiled css/html Button, wrapped as a harness variant. */
const ButtonCssHtmlVariant: ComponentVariant<ButtonVariantProps> = {
  style: "css",
  format: "html",
  render: ButtonTsHtml,
};

beforeEach(() => {
  resetTestState();
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("plain-js delivery", () => {
  test("html add with js lang strips types and keeps the runtime template", () => {
    const root = fixture("html-strip");
    addComponent(["button"], { dir: root, format: "html", lang: "js" });
    const button = readFileSync(join(componentsDir(root), "button.js"), "utf8");
    expect(button).toMatch(/html`/);
    expect(button).toContain(`import { html } from "@hellajs/dom";`);
    expect(button).toContain(`import { style } from "@hellajs/css";`);
    expect(button).not.toMatch(/^\s*interface\b/m);
    expect(button).not.toMatch(/^import type\b/m);
    expect(button).not.toContain(" as HellaNode");
  });

  test("jsx add with js lang preserves JSX while stripping types", () => {
    const root = fixture("jsx-strip");
    addComponent(["button"], { dir: root, format: "jsx", lang: "js" });
    const button = readFileSync(join(componentsDir(root), "button.jsx"), "utf8");
    expect(button).toContain("<button");
    expect(button).not.toMatch(/_jsx|createElement/);
    expect(button).not.toMatch(/^\s*interface\b/m);
    expect(button).not.toMatch(/^import type\b/m);
    expect(button).not.toContain(" as HellaNode");
  });

  test.each(COMBOS)("$style/$format e2e add --lang js writes plain-JS filenames", async ({ style, format }) => {
    const root = fixture(`e2e-${style}-${format}`);
    const [exit] = await runCli(["add", "button", "--style", style, "--format", format, "--lang", "js"], root);
    expect(exit).toBe(0);
    const written = format === "jsx" ? "button.jsx" : "button.js";
    const tsName = format === "jsx" ? "button.tsx" : "button.ts";
    expect(existsSync(join(componentsDir(root), written))).toBe(true);
    expect(existsSync(join(componentsDir(root), tsName))).toBe(false);
    if (style === "tailwind") {
      expect(existsSync(join(componentsDir(root), "cn.js"))).toBe(true);
      expect(existsSync(join(componentsDir(root), "cn.ts"))).toBe(false);
    }
  });

  test("html add of card with js lang strips every named part", () => {
    const root = fixture("card-strip");
    addComponent(["card"], { dir: root, format: "html", lang: "js" });
    const card = readFileSync(join(componentsDir(root), "card.js"), "utf8");
    expect(card).toMatch(/html`/);
    for (const part of ["Card", "CardHeader", "CardTitle", "CardDescription", "CardAction", "CardContent", "CardFooter"]) {
      expect(card).toContain(`function ${part}(props)`);
    }
    expect(card).not.toMatch(/\binterface\b/);
    expect(card).not.toContain(": CardPartProps");
  });

  test("css e2e add with js lang copies tokens.js through verbatim", async () => {
    const root = fixture("e2e-tokens");
    const [exit] = await runCli(["add", "button", "--style", "css", "--format", "html", "--lang", "js"], root);
    expect(exit).toBe(0);
    expect(readFileSync(join(componentsDir(root), "tokens.js"), "utf8")).toBe(tokensSource);
  });

  test("stripped html button renders identically to the TS variant", async () => {
    const root = fixture("parity");
    addComponent(["button"], { dir: root, format: "html", lang: "js" });
    const written = await import(join(componentsDir(root), "button.js")) as {
      default: ComponentVariant<ButtonVariantProps>["render"];
    };
    const stripped = renderVariant(
      { style: "css", format: "html", render: written.default },
      { children: "Save" },
    );
    const tsVariant = renderVariant(
      ButtonCssHtmlVariant,
      { children: "Save" },
    );
    expect(stripped.outerHTML).toBe(tsVariant.outerHTML);
  });

  test("stripped button.jsx compiles through the babel plugin", () => {
    const root = fixture("babel");
    addComponent(["button"], { dir: root, format: "jsx", lang: "js" });
    const jsx = readFileSync(join(componentsDir(root), "button.jsx"), "utf8");
    const result = transformSync(jsx, {
      plugins: [babelHellaJS],
      presets: [presetTypeScript],
      filename: "button.jsx",
      ast: false,
      sourceMaps: true,
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx"] },
    });
    expect(typeof result?.code).toBe("string");
    expect(result!.code!.length).toBeGreaterThan(0);
  });

  test("lang defaults to ts in readConfig", () => {
    const root = fixture("config-default");
    expect(readConfig(root)).toEqual({ componentsDir: "src/components", style: "css", format: "jsx", lang: "ts" });
  });

  test("hella.ui.json lang override reaches addComponent", () => {
    const root = fixture("config-override");
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ lang: "js" }));
    addComponent(["button"], { dir: root });
    expect(existsSync(join(componentsDir(root), "button.jsx"))).toBe(true);
    expect(existsSync(join(componentsDir(root), "button.tsx"))).toBe(false);
  });

  test("invalid lang throws the readConfig contract", () => {
    const root = fixture("config-invalid");
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ lang: "weird" }));
    expect(() => readConfig(root))
      .toThrow('[ui] readConfig: lang must be js or ts, received "weird"');
  });

  test("invalid lang throws the addComponent contract", () => {
    const root = fixture("option-invalid");
    expect(() => addComponent(["button"], { dir: root, lang: "weird" as UiLang }))
      .toThrow('[ui] addComponent: lang must be js or ts, received "weird"');
  });
});
