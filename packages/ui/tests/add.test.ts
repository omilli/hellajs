import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addComponent } from "@hellajs/ui/bundle";
import type { UiFormat, UiStyle } from "@hellajs/ui";

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
    expect(button.startsWith('import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";')).toBe(true);
    expect(button).toContain('import { style } from "@hellajs/css";');
    expect(button).toContain('import { tokens } from "./tokens.js";');
    expect(button).toContain("const base = style(");
    expect(button.includes('layer: "hella"')).toBe(false);
    const tokens = readFileSync(join(componentsDir, "tokens.ts"), "utf8");
    expect(tokens.includes('layer: "hella"')).toBe(false);
    expect(tokens.includes("@layer")).toBe(false);
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(true);
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
    expect(button).toContain("cn(\n          \"inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\",\n          variants[variant ?? \"default\"],");
    expect(button.includes('const base = "inline-flex')).toBe(false);
    expect(button.includes("@hellajs/css")).toBe(false);
    expect(button.includes("@hella:")).toBe(false);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(false);
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
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(true);
  });

  test("lang js renames the copied helper to cn.js", () => {
    addComponent(["button"], { dir: root, style: "tailwind", lang: "js" });
    expect(existsSync(join(componentsDir, "cn.js"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(false);
  });

  test("css add of input pulls the tokens theme and no tailwind artifacts", () => {
    addComponent(["input"], { dir: root });
    expect(existsSync(join(componentsDir, "input.tsx"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(false);
  });

  test("tailwind add of input pulls theme.css and cn, never tokens", () => {
    addComponent(["input"], { dir: root, style: "tailwind" });
    expect(existsSync(join(componentsDir, "input.tsx"))).toBe(true);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(false);
  });

  test("css add of a static component pulls the tokens theme and no tailwind artifacts", () => {
    addComponent(["badge", "alert", "kbd", "separator", "skeleton", "spinner", "empty", "label"], { dir: root });
    for (const name of ["badge", "alert", "kbd", "separator", "skeleton", "spinner", "empty", "label"]) {
      expect(existsSync(join(componentsDir, `${name}.tsx`))).toBe(true);
    }
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(false);
  });

  test("tailwind add of a static component pulls theme.css and cn, never tokens", () => {
    addComponent(["badge", "alert", "kbd", "separator", "skeleton", "spinner", "empty", "label"], { dir: root, style: "tailwind" });
    for (const name of ["badge", "alert", "kbd", "separator", "skeleton", "spinner", "empty", "label"]) {
      expect(existsSync(join(componentsDir, `${name}.tsx`))).toBe(true);
    }
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(false);
  });

  test("css add of input-group recursively copies its component dependencies and the theme", () => {
    addComponent(["input-group"], { dir: root });
    for (const name of ["input-group", "input", "textarea", "button"]) {
      expect(existsSync(join(componentsDir, `${name}.tsx`))).toBe(true);
    }
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(false);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(false);
  });

  test("css add of button-group recursively copies separator, field copies label and separator", () => {
    addComponent(["button-group", "field"], { dir: root });
    for (const name of ["button-group", "separator", "field", "label"]) {
      expect(existsSync(join(componentsDir, `${name}.tsx`))).toBe(true);
    }
    expect(existsSync(join(componentsDir, "textarea.tsx"))).toBe(false);
  });

  test("existing files are skipped with a warning until overwrite", () => {
    addComponent(["button"], { dir: root });
    const copied = join(componentsDir, "button.tsx");
    writeFileSync(copied, "// sentinel");
    addComponent(["button"], { dir: root });
    expect(readFileSync(copied, "utf8")).toBe("// sentinel");
    expect(warnings.join("\n")).toContain("skipped");
    addComponent(["button"], { dir: root, overwrite: true });
    expect(readFileSync(copied, "utf8").startsWith('import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";')).toBe(true);
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
      expect(card).toContain(`[${part}, cls]`);
    }
    const dialog = readFileSync(join(componentsDir, "dialog.tsx"), "utf8");
    expect(dialog.includes("@hella:")).toBe(false);
    for (const part of ["base", "content", "close", "header", "footer", "title", "description"]) {
      expect(dialog).toContain(`[${part}, cls]`);
    }
    const tabs = readFileSync(join(componentsDir, "tabs.tsx"), "utf8");
    expect(tabs.includes("@hella:")).toBe(false);
    for (const part of ["base", "trigger", "content"]) {
      expect(tabs).toContain(`[${part}, cls]`);
    }
    expect(tabs).toContain("[list, variants[variant], cls]");
  });

  test("tailwind add of multi-part components wraps every part in cn with zero markers", () => {
    addComponent(["card", "tabs"], { dir: root, style: "tailwind" });
    const card = readFileSync(join(componentsDir, "card.tsx"), "utf8");
    expect(card.includes("@hella:")).toBe(false);
    expect(card).toContain('cn("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", cls)');
    expect(card).toContain('cn("flex items-center px-6 [.border-t]:pt-6", cls)');
    const tabs = readFileSync(join(componentsDir, "tabs.tsx"), "utf8");
    expect(tabs.includes("@hella:")).toBe(false);
    expect(tabs).toContain(`cn("group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none", variants[variant], cls)`);
    expect(tabs).toContain(`cn("relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100", cls)`);
  });

  test("unknown component throws naming it", () => {
    expect(() => addComponent(["ghost-button"], { dir: root }))
      .toThrow('[ui] resolveEntry: component "ghost-button" not found in registry');
  });

  test("unknown style throws the two-style contract", () => {
    expect(() => addComponent(["button"], { dir: root, style: "bogus" as UiStyle }))
      .toThrow('[ui] addComponent: style must be one of css, tailwind, received "bogus"');
  });

  test("empty names throw the at-least-one contract", () => {
    expect(() => addComponent([], { dir: root }))
      .toThrow("[ui] addComponent: at least one component name is required");
  });

  test("invalid format throws the two-format contract", () => {
    expect(() => addComponent(["button"], { dir: root, format: "bogus" as UiFormat }))
      .toThrow('[ui] addComponent: format must be jsx or html, received "bogus"');
  });

  test("a target dir without package.json throws the checkPeers contract", () => {
    const bare = join(root, "bare");
    mkdirSync(bare);
    expect(() => addComponent(["button"], { dir: bare }))
      .toThrow(`[ui] checkPeers: package.json not found in ${bare}`);
  });

  test("a target dir with unparseable package.json throws the checkPeers JSON contract", () => {
    const broken = join(root, "broken");
    mkdirSync(broken);
    writeFileSync(join(broken, "package.json"), "{ oops");
    expect(() => addComponent(["button"], { dir: broken }))
      .toThrow(`[ui] checkPeers: invalid JSON in ${join(broken, "package.json")}`);
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
