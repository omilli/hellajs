import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addComponent } from "@hellajs/ui/bundle";
import type { UiStyle } from "@hellajs/ui";

const root = join(import.meta.dir, ".tmp", "add");
const componentsDir = join(root, "src", "components");

describe("addComponent", () => {
  let originalWarn: typeof console.warn;
  let warnings: string[];

  beforeEach(() => {
    rmSync(root, { recursive: true, force: true });
    cpSync(join(import.meta.dir, "fixtures", "empty-app"), root, { recursive: true });
    originalWarn = console.warn;
    warnings = [];
    console.warn = mock((...args: unknown[]) => { warnings.push(args.join(" ")); }) as typeof console.warn;
  });

  afterEach(() => {
    console.warn = originalWarn;
    rmSync(root, { recursive: true, force: true });
  });

  test("default add lands the spliced css canonical plus the tokens theme", () => {
    addComponent(["button"], { dir: root });
    const button = readFileSync(join(componentsDir, "button.tsx"), "utf8");
    expect(button.includes("@hella:")).toBe(false);
    expect(button.startsWith('import type { HellaChildren, HellaNode } from "@hellajs/dom";')).toBe(true);
    expect(button).toContain('import { style } from "@hellajs/css";');
    expect(button).toContain("const base = style(");
    expect(button).toContain('layer: "hella"');
    expect(existsSync(join(componentsDir, "tokens.js"))).toBe(true);
    expect(existsSync(join(componentsDir, "button-html.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "button-css.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "button-tailwind.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(false);
  });

  test("tailwind add lands the spliced canonical plus cn and theme.css, with no @hellajs/css anywhere", () => {
    addComponent(["button"], { dir: root, style: "tailwind" });
    const button = readFileSync(join(componentsDir, "button.tsx"), "utf8");
    expect(button).toContain('import { cn } from "./cn.js";');
    expect(button).toContain('const base = "inline-flex');
    expect(button).toContain("cn(\n          base,\n          variants[props.variant ?? \"default\"],");
    expect(button.includes("@hellajs/css")).toBe(false);
    expect(button.includes("@hella:")).toBe(false);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.js"))).toBe(false);
    expect(existsSync(join(componentsDir, "button-css.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "button-tailwind.ts"))).toBe(false);
  });

  test("html add lands button.ts renamed from the html flavor with the array interpolation", () => {
    addComponent(["button"], { dir: root, format: "html" });
    const button = readFileSync(join(componentsDir, "button.ts"), "utf8");
    expect(button).toContain("html`");
    expect(button).toContain('class="${\n        [\n          base,');
    expect(button.includes("@hella:")).toBe(false);
    expect(existsSync(join(componentsDir, "button.tsx"))).toBe(false);
    expect(existsSync(join(componentsDir, "button-html.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "tokens.js"))).toBe(true);
  });

  test("css add of input pulls the tokens theme and no tailwind artifacts", () => {
    addComponent(["input"], { dir: root });
    expect(existsSync(join(componentsDir, "input.tsx"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.js"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(false);
  });

  test("tailwind add of input pulls theme.css and cn, never tokens.js", () => {
    addComponent(["input"], { dir: root, style: "tailwind" });
    expect(existsSync(join(componentsDir, "input.tsx"))).toBe(true);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.js"))).toBe(false);
  });

  test("existing files are skipped with a warning until overwrite", () => {
    addComponent(["button"], { dir: root });
    const copied = join(componentsDir, "button.tsx");
    writeFileSync(copied, "// sentinel");
    addComponent(["button"], { dir: root });
    expect(readFileSync(copied, "utf8")).toBe("// sentinel");
    expect(warnings.join("\n")).toContain("skipped");
    addComponent(["button"], { dir: root, overwrite: true });
    expect(readFileSync(copied, "utf8").startsWith('import type { HellaChildren, HellaNode } from "@hellajs/dom";')).toBe(true);
  });

  test("tailwind add of theme demands tw-animate-css in the peer diff", () => {
    addComponent(["theme"], { dir: root, style: "tailwind" });
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(warnings.join("\n")).toContain("tw-animate-css");
  });

  test("css add of multi-part components splices every compose region with zero markers", () => {
    addComponent(["card", "dialog", "tabs"], { dir: root });
    const card = readFileSync(join(componentsDir, "card.tsx"), "utf8");
    expect(card.includes("@hella:")).toBe(false);
    for (const part of ["base", "header", "title", "description", "action", "content", "footer"]) {
      expect(card).toContain(`[${part}, props.class]`);
    }
    const dialog = readFileSync(join(componentsDir, "dialog.tsx"), "utf8");
    expect(dialog.includes("@hella:")).toBe(false);
    for (const part of ["base", "content", "close", "header", "footer", "title", "description"]) {
      expect(dialog).toContain(`[${part}, props.class]`);
    }
    const tabs = readFileSync(join(componentsDir, "tabs.tsx"), "utf8");
    expect(tabs.includes("@hella:")).toBe(false);
    for (const part of ["base", "trigger", "content"]) {
      expect(tabs).toContain(`[${part}, props.class]`);
    }
    expect(tabs).toContain("[list, variants[variant], props.class]");
  });

  test("tailwind add of multi-part components wraps every part in cn with zero markers", () => {
    addComponent(["card", "tabs"], { dir: root, style: "tailwind" });
    const card = readFileSync(join(componentsDir, "card.tsx"), "utf8");
    expect(card.includes("@hella:")).toBe(false);
    expect(card).toContain("cn(header, props.class)");
    expect(card).toContain("cn(footer, props.class)");
    const tabs = readFileSync(join(componentsDir, "tabs.tsx"), "utf8");
    expect(tabs.includes("@hella:")).toBe(false);
    expect(tabs).toContain("cn(list, variants[variant], props.class)");
    expect(tabs).toContain("cn(trigger, props.class)");
  });

  test("unknown component throws naming it", () => {
    expect(() => addComponent(["ghost-button"], { dir: root }))
      .toThrow('[ui] resolveEntry: component "ghost-button" not found in registry');
  });

  test("unknown style throws the two-style contract", () => {
    expect(() => addComponent(["button"], { dir: root, style: "bogus" as UiStyle }))
      .toThrow('[ui] addComponent: style must be one of css, tailwind, received "bogus"');
  });

  test.each([
    ["css", "@hellajs/core @hellajs/dom @hellajs/css"],
    ["tailwind", "@hellajs/core @hellajs/dom tw-animate-css clsx tailwind-merge"],
  ] as [UiStyle, string][])("peer warning names exactly the missing packages for the %s style", (style, installLine) => {
    addComponent(["button"], { dir: root, style, format: "jsx" });
    const joined = warnings.join("\n");
    expect(joined).toContain(`bun add ${installLine}`);
  });

  test.each([
    ["css", "@hellajs/core @hellajs/dom @hellajs/css"],
    ["tailwind", "@hellajs/core @hellajs/dom tw-animate-css clsx tailwind-merge"],
  ] as [UiStyle, string][])("dialog peer warning names exactly the missing packages for the %s style", (style, installLine) => {
    addComponent(["dialog"], { dir: root, style, format: "jsx" });
    const joined = warnings.join("\n");
    expect(joined).toContain(`bun add ${installLine}`);
  });

  test.each([
    ["css", "@hellajs/core @hellajs/dom @hellajs/css"],
    ["tailwind", "@hellajs/core @hellajs/dom tw-animate-css clsx tailwind-merge"],
  ] as [UiStyle, string][])("tabs peer warning names exactly the missing packages for the %s style", (style, installLine) => {
    addComponent(["tabs"], { dir: root, style, format: "jsx" });
    const joined = warnings.join("\n");
    expect(joined).toContain(`bun add ${installLine}`);
  });
});
