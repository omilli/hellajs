import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { cpSync, existsSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listComponents, main, readConfig } from "@hellajs/ui/bundle";

const root = join(import.meta.dir, ".tmp", "main");
const componentsDir = join(root, "src", "components");

describe("main", () => {
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

  test("throws the unknown-command contract prefixed by the two-style usage overview", async () => {
    await expect(main(["bogus"])).rejects.toThrow('[ui] main: unknown command "bogus"');
    await expect(main(["bogus"])).rejects.toThrow("--style css|tailwind");
    await expect(main(["bogus"])).rejects.toThrow("--lang js|ts");
  });

  test("lists registry components and exits clean", async () => {
    expect(await main(["list"])).toBe(0);
    expect(listComponents()).toEqual(["accordion", "alert", "alert-dialog", "aspect-ratio", "attachment", "avatar", "badge", "breadcrumb", "bubble", "button", "button-group", "calendar", "card", "checkbox", "cn", "collapsible", "combobox", "command", "context-menu", "dialog", "direction", "drawer", "dropdown-menu", "empty", "field", "form", "hover-card", "input", "input-group", "input-otp", "item", "kbd", "label", "marker", "menubar", "message", "message-scroller", "native-select", "navigation-menu", "pagination", "popover", "progress", "radio-group", "resizable", "scroll-area", "select", "separator", "sheet", "sidebar", "skeleton", "slider", "sonner", "spinner", "switch", "table", "tabs", "textarea", "theme", "toggle", "toggle-group", "tooltip"]);
  });

  test("init writes defaults and theme tokens, warns and keeps an existing config, and --force rewrites it", async () => {
    expect(await main(["init", "--dir", root])).toBe(0);
    expect(readConfig(root)).toEqual({ componentsDir: "src/components", style: "css", format: "jsx", lang: "ts" });
    expect(existsSync(join(componentsDir, "tokens.js"))).toBe(true);
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ style: "tailwind" }));
    await main(["init", "--dir", root]);
    expect(warnings.join("\n")).toContain("[ui] initProject: hella.ui.json already exists");
    expect(readConfig(root)).toEqual({ componentsDir: "src/components", style: "tailwind", format: "jsx", lang: "ts" });
    expect(await main(["init", "--force", "--dir", root])).toBe(0);
    expect(readConfig(root)).toEqual({ componentsDir: "src/components", style: "css", format: "jsx", lang: "ts" });
  });

  test("add dispatches html format with lang js into button.js and theme.css, and --overwrite repeats clean", async () => {
    expect(await main(["add", "button", "--style", "tailwind", "--format", "html", "--lang", "js", "--dir", root])).toBe(0);
    expect(existsSync(join(componentsDir, "button.js"))).toBe(true);
    expect(existsSync(join(componentsDir, "button.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "button.tsx"))).toBe(false);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(await main(["add", "button", "--style", "tailwind", "--format", "html", "--lang", "js", "--overwrite", "--dir", root])).toBe(0);
  });

  test("a value-less flag rejects with the requires-a-value contract", async () => {
    await expect(main(["add", "--dir"])).rejects.toThrow("[ui] main: flag --dir requires a value");
  });

  test("an unknown flag rejects with the unknown-flag contract", async () => {
    await expect(main(["add", "button", "--bogus"])).rejects.toThrow('[ui] main: unknown flag "--bogus"');
  });
});
