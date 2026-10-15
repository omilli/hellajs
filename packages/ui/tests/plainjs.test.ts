import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { resetTestState } from "@utils/test-helpers.js";
import { addComponent, readConfig } from "@hellajs/ui/bundle";
import { Button as ButtonTsJsx } from "../dist/registry/button/css/button";
import { transformSync } from "@babel/core";
import babelHellaJS from "babel-plugin-hellajs";
import presetTypeScript from "@babel/preset-typescript";
import type { UiLang, UiStyle } from "@hellajs/ui";
import type { ButtonVariantProps, ComponentVariant } from "./helpers/variants";
import { renderVariant } from "./helpers/variants";
import { runCli } from "./helpers/cli";

const fixtureApp = join(import.meta.dir, "fixtures", "empty-app");
const scratch = join(import.meta.dir, ".tmp", "plainjs");

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

const COMBOS: { style: UiStyle }[] = [
  { style: "css" },
  { style: "tailwind" },
];

/** The TS comparator for the parity test: the compiled css Button, wrapped as a harness variant. */
const ButtonCssVariant: ComponentVariant<ButtonVariantProps> = {
  style: "css",
  render: ButtonTsJsx,
};

beforeEach(() => {
  resetTestState();
});

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true });
});

describe("plain-js delivery", () => {
  test("jsx add with js lang preserves JSX while stripping types", () => {
    const root = fixture("jsx-strip");
    addComponent(["button"], { dir: root, lang: "js" });
    const button = readFileSync(join(componentsDir(root), "button.jsx"), "utf8");
    expect(button).toContain("<button");
    expect(button).not.toMatch(/_jsx|createElement/);
    expect(button).not.toMatch(/^\s*interface\b/m);
    expect(button).not.toMatch(/^import type\b/m);
    expect(button).not.toContain(" as HellaNode");
  });

  test.each(COMBOS)("$style e2e add --lang js writes plain-JS filenames", async ({ style }) => {
    const root = fixture(`e2e-${style}`);
    const [exit] = await runCli(["add", "button", "--style", style, "--lang", "js"], root);
    expect(exit).toBe(0);
    expect(existsSync(join(componentsDir(root), "button.jsx"))).toBe(true);
    expect(existsSync(join(componentsDir(root), "button.tsx"))).toBe(false);
    if (style === "tailwind") {
      expect(existsSync(join(componentsDir(root), "cn.js"))).toBe(true);
      expect(existsSync(join(componentsDir(root), "cn.ts"))).toBe(false);
    }
  });

  test("card add with js lang strips every named part", () => {
    const root = fixture("card-strip");
    addComponent(["card"], { dir: root, lang: "js" });
    const card = readFileSync(join(componentsDir(root), "card.jsx"), "utf8");
    expect(card).toContain("<div");
    for (const part of ["Card", "CardHeader", "CardTitle", "CardDescription", "CardAction", "CardContent", "CardFooter"]) {
      expect(card).toContain(`function ${part}({ children, class: cls, ...attrs })`);
    }
    expect(card).not.toMatch(/\binterface\b/);
    expect(card).not.toContain(": CardPartProps");
  });

  test("css e2e add with js lang strips tokens.ts to plain js and retargets the import", async () => {
    const root = fixture("e2e-tokens");
    const [exit] = await runCli(["add", "button", "--style", "css", "--lang", "js"], root);
    expect(exit).toBe(0);
    expect(existsSync(join(componentsDir(root), "tokens.ts"))).toBe(false);
    const tokens = readFileSync(join(componentsDir(root), "tokens.js"), "utf8");
    // esbuild output formatting may churn — structural invariants, not byte-golden text.
    expect(tokens).toContain("const tokens = vars({");
    expect(tokens).toContain("cardForeground");
    expect(tokens).toMatch(/export\s*\{[^}]*tokens[^}]*\}/);
    const button = readFileSync(join(componentsDir(root), "button.jsx"), "utf8");
    expect(button).toContain('import { tokens } from "./tokens.js";');
  });

  test("the stripped css button renders identically to the compiled TS variant", async () => {
    const root = fixture("parity");
    addComponent(["button"], { dir: root, lang: "js" });
    const jsx = readFileSync(join(componentsDir(root), "button.jsx"), "utf8");
    const compiled = transformSync(jsx, {
      plugins: [babelHellaJS],
      filename: "button.jsx",
      ast: false,
      sourceMaps: false,
      configFile: false,
      babelrc: false,
      parserOpts: { plugins: ["jsx"] },
    })!.code!;
    const compiledPath = join(componentsDir(root), "button.compiled.js");
    writeFileSync(compiledPath, compiled);
    const written = await import(compiledPath) as {
      Button: ComponentVariant<ButtonVariantProps>["render"];
    };
    const stripped = renderVariant(
      { style: "css", render: written.Button },
      { children: "Save" },
    );
    const tsVariant = renderVariant(
      ButtonCssVariant,
      { children: "Save" },
    );
    expect(stripped.outerHTML).toBe(tsVariant.outerHTML);
  });

  test("stripped button.jsx compiles through the babel plugin", () => {
    const root = fixture("babel");
    addComponent(["button"], { dir: root, lang: "js" });
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
    expect(readConfig(root)).toEqual({ componentsDir: "src/components", style: "css", themeMode: "light", lang: "ts" });
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
