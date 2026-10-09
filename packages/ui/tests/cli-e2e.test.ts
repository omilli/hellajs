import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runCli } from "./helpers/cli";

const root = join(import.meta.dir, ".tmp", "e2e");
const componentsDir = join(root, "src", "components");

describe("cli e2e", () => {
  beforeEach(() => {
    rmSync(root, { recursive: true, force: true });
    cpSync(join(import.meta.dir, "fixtures", "empty-app"), root, { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("init copies the tokens theme for the css default", async () => {
    const [exit] = await runCli(["init"], root);
    expect(exit).toBe(0);
    const config = JSON.parse(readFileSync(join(root, "hella.ui.json"), "utf8"));
    expect(config).toEqual({ componentsDir: "src/components", style: "css", format: "jsx", themeMode: "light", lang: "ts" });
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(false);
    expect(existsSync(join(componentsDir, "button.tsx"))).toBe(false);
  });

  test("init --theme-mode dark writes the dark config and the dark-only tokens sheet", async () => {
    const [exit] = await runCli(["init", "--theme-mode", "dark"], root);
    expect(exit).toBe(0);
    const config = JSON.parse(readFileSync(join(root, "hella.ui.json"), "utf8"));
    expect(config.themeMode).toBe("dark");
    expect(readFileSync(join(componentsDir, "tokens.ts"), "utf8")).toBe(
      readFileSync(join(import.meta.dir, "..", "registry", "theme", "tokens.dark.ts"), "utf8"),
    );
  });

  test("a dark themeMode emits dark tokens for theme and button, a light default keeps light tokens, and the flag overrides a light config", async () => {
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ themeMode: "dark" }));
    const [darkThemeExit] = await runCli(["add", "theme"], root);
    expect(darkThemeExit).toBe(0);
    const darkTokens = readFileSync(join(componentsDir, "tokens.ts"), "utf8");
    expect(darkTokens).toBe(readFileSync(join(import.meta.dir, "..", "registry", "theme", "tokens.dark.ts"), "utf8"));
    rmSync(join(componentsDir, "tokens.ts"));
    const [buttonExit] = await runCli(["add", "button"], root);
    expect(buttonExit).toBe(0);
    expect(readFileSync(join(componentsDir, "tokens.ts"), "utf8")).toBe(darkTokens);
    rmSync(root, { recursive: true, force: true });
    cpSync(join(import.meta.dir, "fixtures", "empty-app"), root, { recursive: true });
    const [lightExit] = await runCli(["add", "theme"], root);
    expect(lightExit).toBe(0);
    expect(readFileSync(join(componentsDir, "tokens.ts"), "utf8")).toBe(
      readFileSync(join(import.meta.dir, "..", "registry", "theme", "tokens.ts"), "utf8"),
    );
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ themeMode: "light" }));
    const [overrideExit] = await runCli(["add", "theme", "--theme-mode", "dark", "--overwrite"], root);
    expect(overrideExit).toBe(0);
    const config = JSON.parse(readFileSync(join(root, "hella.ui.json"), "utf8"));
    expect(config.themeMode).toBe("light");
    expect(readFileSync(join(componentsDir, "tokens.ts"), "utf8")).toBe(
      readFileSync(join(import.meta.dir, "..", "registry", "theme", "tokens.dark.ts"), "utf8"),
    );
  });

  test("themeMode dark with the tailwind style rejects through both the add and init paths", async () => {
    const [addExit] = await runCli(["add", "theme", "--style", "tailwind", "--theme-mode", "dark"], root);
    expect(addExit).toBe(1);
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ style: "tailwind" }));
    const [initExit] = await runCli(["init", "--theme-mode", "dark"], root);
    expect(initExit).toBe(1);
  });

  test("init against a tailwind config keeps it and adds theme.css plus cn.ts", async () => {
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ style: "tailwind" }));
    const [exit] = await runCli(["init"], root);
    expect(exit).toBe(0);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.ts"))).toBe(false);
  });

  test("add button --style tailwind --format html lands the renamed spliced file", async () => {
    const [exit] = await runCli(["add", "button", "--style", "tailwind", "--format", "html"], root);
    expect(exit).toBe(0);
    const button = readFileSync(join(componentsDir, "button.ts"), "utf8");
    expect(button).toContain('import { cn } from "./cn.js";');
    expect(button).toContain("cn(\n          \"inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4\",\n          variants[variant ?? \"default\"],");
    expect(button.includes("@hellajs/css")).toBe(false);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(existsSync(join(componentsDir, "button.tsx"))).toBe(false);
  });

  test("add card --style tailwind lands the multi-part spliced file with zero markers", async () => {
    const [exit] = await runCli(["add", "card", "--style", "tailwind", "--format", "jsx"], root);
    expect(exit).toBe(0);
    const card = readFileSync(join(componentsDir, "card.tsx"), "utf8");
    expect(card.includes("@hella:")).toBe(false);
    expect(card).toContain('cn("flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm", cls)');
    expect(card).toContain('cn("flex items-center px-6 [.border-t]:pt-6", cls)');
    expect(card.includes("const header")).toBe(false);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
  });

  test("list prints the registry entry names", async () => {
    const [exit, stdout] = await runCli(["list"], root);
    expect(exit).toBe(0);
    expect(stdout).toBe("accordion\nalert\nalert-dialog\naspect-ratio\nattachment\navatar\nbadge\nbreadcrumb\nbubble\nbutton\nbutton-group\ncalendar\ncard\ncheckbox\ncn\ncollapsible\ncombobox\ncommand\ncontext-menu\ndialog\ndirection\ndrawer\ndropdown-menu\nempty\nfield\nform\nhover-card\ninput\ninput-group\ninput-otp\nitem\nkbd\nlabel\nmarker\nmenubar\nmessage\nmessage-scroller\nnative-select\nnavigation-menu\npagination\npopover\nprogress\nradio-group\nresizable\nscroll-area\nselect\nseparator\nsheet\nsidebar\nskeleton\nslider\nsonner\nspinner\nswitch\ntable\ntabs\ntextarea\ntheme\ntoggle\ntoggle-group\ntooltip\n");
  });

  test("unknown command exits 1", async () => {
    const [exit] = await runCli(["deploy"], root);
    expect(exit).toBe(1);
  });
});
