import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { cpSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runCli } from "./helpers/cli";

const root = join(import.meta.dir, ".tmp", "drift");
const componentsDir = join(root, "src", "components", "ui");
const vendoredDir = join(import.meta.dir, "..", "..", "..", "docs", "src", "components", "ui");

describe("docs vendoring drift", () => {
  beforeEach(() => {
    rmSync(root, { recursive: true, force: true });
    cpSync(join(import.meta.dir, "fixtures", "empty-app"), root, { recursive: true });
    writeFileSync(
      join(root, "hella.ui.json"),
      JSON.stringify({ componentsDir: "src/components/ui", style: "css", format: "html" }),
    );
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("add reproduces the vendored docs file set", async () => {
    const [exit] = await runCli(["add", "button", "input", "card", "dialog", "tabs", "theme"], root);
    expect(exit).toBe(0);
    expect(readdirSync(componentsDir).sort()).toEqual(readdirSync(vendoredDir).sort());
  });

  test.each(readdirSync(vendoredDir).sort())("%s byte-matches the fresh add output", async (name) => {
    const [exit] = await runCli(["add", "button", "input", "card", "dialog", "tabs", "theme"], root);
    expect(exit).toBe(0);
    expect(readFileSync(join(componentsDir, name), "utf8")).toBe(readFileSync(join(vendoredDir, name), "utf8"));
  });
});
