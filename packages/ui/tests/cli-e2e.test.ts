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
    expect(config).toEqual({ componentsDir: "src/components", style: "css", format: "jsx", lang: "ts" });
    expect(existsSync(join(componentsDir, "tokens.js"))).toBe(true);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(false);
    expect(existsSync(join(componentsDir, "button.tsx"))).toBe(false);
  });

  test("init against a tailwind config keeps it and adds theme.css plus cn.ts", async () => {
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ style: "tailwind" }));
    const [exit] = await runCli(["init"], root);
    expect(exit).toBe(0);
    expect(existsSync(join(componentsDir, "theme.css"))).toBe(true);
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
    expect(existsSync(join(componentsDir, "tokens.js"))).toBe(false);
  });

  test("add button --style tailwind --format html lands the renamed spliced file", async () => {
    const [exit] = await runCli(["add", "button", "--style", "tailwind", "--format", "html"], root);
    expect(exit).toBe(0);
    const button = readFileSync(join(componentsDir, "button.ts"), "utf8");
    expect(button).toContain('import { cn } from "./cn.js";');
    expect(button).toContain("cn(\n          base,\n          variants[props.variant ?? \"default\"],");
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
    expect(card).toContain("cn(header, props.class)");
    expect(card).toContain("cn(footer, props.class)");
    expect(existsSync(join(componentsDir, "cn.ts"))).toBe(true);
  });

  test("list prints the registry entry names", async () => {
    const [exit, stdout] = await runCli(["list"], root);
    expect(exit).toBe(0);
    expect(stdout).toBe("button\ncard\ncn\ndialog\ninput\ntabs\ntheme\n");
  });

  test("unknown command exits 1", async () => {
    const [exit] = await runCli(["deploy"], root);
    expect(exit).toBe(1);
  });
});
