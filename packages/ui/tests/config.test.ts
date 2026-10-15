import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readConfig } from "@hellajs/ui/bundle";

describe("readConfig", () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "ui-config-"));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test("falls back to defaults when hella.ui.json is absent", () => {
    expect(readConfig(root)).toEqual({ componentsDir: "src/components", style: "css", themeMode: "light", lang: "ts" });
  });

  test("reads overrides from hella.ui.json when present", () => {
    writeFileSync(
      join(root, "hella.ui.json"),
      JSON.stringify({ componentsDir: "app/ui", style: "tailwind" }),
    );
    expect(readConfig(root)).toEqual({ componentsDir: "app/ui", style: "tailwind", themeMode: "light", lang: "ts" });
  });

  test("round-trips a dark themeMode from hella.ui.json", () => {
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ themeMode: "dark" }));
    expect(readConfig(root).themeMode).toBe("dark");
  });

  test("throws the themeMode contract for an invalid themeMode", () => {
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ themeMode: "midnight" }));
    expect(() => readConfig(root))
      .toThrow('[ui] readConfig: themeMode must be light or dark, received "midnight"');
  });

  test("throws the two-style contract for an invalid style", () => {
    writeFileSync(join(root, "hella.ui.json"), JSON.stringify({ style: "bogus" }));
    expect(() => readConfig(root))
      .toThrow('[ui] readConfig: style must be one of css, tailwind, received "bogus"');
  });

  test("throws the invalid-JSON contract for unparseable hella.ui.json", () => {
    writeFileSync(join(root, "hella.ui.json"), "{ oops");
    expect(() => readConfig(root)).toThrow("[ui] readConfig: invalid JSON in");
  });
});
