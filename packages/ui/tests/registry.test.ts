import { describe, test, expect } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadRegistry } from "@hellajs/ui/bundle";
import type { RegistryEntry, UiStyle } from "@hellajs/ui";

const registryDir = join(import.meta.dir, "..", "registry");
const manifest = loadRegistry();

/** Shared and per-style files of an entry at a style slot. */
function filesAt(entry: RegistryEntry, style: UiStyle): string[] {
  const styled = entry.styles?.[style];
  return [...(entry.files ?? []), ...(styled?.files ?? [])];
}

/** The conventionally named style module of an entry at a style, when it has canonicals. */
function styleModuleOf(entryName: string, entry: RegistryEntry, style: UiStyle): string | undefined {
  return (entry.files ?? []).length > 0 ? `${entryName}-${style}.ts` : undefined;
}

/** Files on disk as `[entryName, fileName]` pairs; registry.json excluded. */
function diskFiles(): [string, string][] {
  const found: [string, string][] = [];
  for (const entryName of readdirSync(registryDir)) {
    const entryDir = join(registryDir, entryName);
    if (!statSync(entryDir).isDirectory()) continue;
    for (const file of readdirSync(entryDir)) {
      if (statSync(join(entryDir, file)).isFile()) found.push([entryName, file]);
    }
  }
  return found;
}

/** Registry file text for an entry-relative file name. */
function readEntryFile(entryName: string, file: string): string {
  return readFileSync(join(registryDir, entryName, file), "utf8");
}

describe("registry", () => {
  test("every file on disk maps to a manifest slot or a conventional style module", () => {
    for (const [entryName, file] of diskFiles()) {
      const entry = manifest.entries[entryName];
      expect(entry).toBeDefined();
      const listed = Object.keys(entry!.styles ?? {}).some((style) => {
        return filesAt(entry!, style as UiStyle).includes(file)
          || styleModuleOf(entryName, entry!, style as UiStyle) === file;
      });
      expect(listed).toBe(true);
    }
  });

  test("every manifest-declared file exists on disk", () => {
    for (const [name, entry] of Object.entries(manifest.entries)) {
      for (const style of Object.keys(entry.styles ?? {}) as UiStyle[]) {
        for (const file of filesAt(entry, style)) {
          expect(existsSync(join(registryDir, name, file))).toBe(true);
        }
      }
    }
  });

  test("every canonical carries exactly one styles region, at least one compose region, and a matching end for each", () => {
    for (const [name, entry] of Object.entries(manifest.entries)) {
      for (const file of entry.files ?? []) {
        if (!file.endsWith(".tsx") && !file.endsWith(".ts")) continue;
        const text = readEntryFile(name, file);
        const styles = text.split("@hella:styles").length - 1;
        const compose = text.split("@hella:compose").length - 1;
        expect(styles).toBe(1);
        expect(compose).toBeGreaterThanOrEqual(1);
        expect(text.split("@hella:end").length - 1).toBe(styles + compose);
      }
    }
  });

  test("every component style slot owns its conventional style module binding base plus lowerCamel parts", () => {
    for (const [name, entry] of Object.entries(manifest.entries)) {
      for (const style of Object.keys(entry.styles ?? {}) as UiStyle[]) {
        const styleFile = styleModuleOf(name, entry, style);
        if (styleFile === undefined) continue;
        const text = readEntryFile(name, styleFile);
        expect(text).toContain("export const base =");
        const names = [...text.matchAll(/export const ([A-Za-z0-9]+)/g)].map(([, symbol]) => symbol!);
        expect(names).toContain("base");
        for (const symbol of names) expect(symbol).toMatch(/^[a-z][a-zA-Z0-9]*$/);
      }
    }
  });

  test("per-style registryDependencies reference declared entries", () => {
    for (const entry of Object.values(manifest.entries)) {
      for (const style of Object.values(entry.styles ?? {})) {
        for (const dep of style.registryDependencies) {
          expect(manifest.entries[dep]).toBeDefined();
        }
      }
    }
  });

  test("registry dependency graph forms no cycles", () => {
    const visiting = new Set<string>();
    const done = new Set<string>();
    const visit = (name: string): void => {
      if (done.has(name)) return;
      if (visiting.has(name)) throw new Error(`cycle at "${name}"`);
      visiting.add(name);
      const entry = manifest.entries[name]!;
      for (const style of Object.values(entry.styles ?? {})) {
        for (const dep of style.registryDependencies) visit(dep);
      }
      visiting.delete(name);
      done.add(name);
    };
    expect(() => { for (const name of Object.keys(manifest.entries)) visit(name); }).not.toThrow();
  });

  test("theme and cn style slots agree with their files", () => {
    const theme = manifest.entries.theme!;
    expect(Object.keys(theme.styles!).sort()).toEqual(["css", "tailwind"]);
    expect(theme.styles!.css!.files).toEqual(["tokens.js"]);
    expect(theme.styles!.tailwind!.files).toEqual(["theme.css"]);
    expect(theme.styles!.tailwind!.deps).toEqual(["tw-animate-css"]);
    expect(existsSync(join(registryDir, "theme", "tokens.js"))).toBe(true);
    expect(existsSync(join(registryDir, "theme", "theme.css"))).toBe(true);

    const cn = manifest.entries.cn!;
    expect(Object.keys(cn.styles!)).toEqual(["tailwind"]);
    expect(cn.styles!.tailwind!.files).toEqual(["cn.ts"]);
    expect(cn.styles!.tailwind!.deps).toEqual(["clsx", "tailwind-merge"]);
    expect(existsSync(join(registryDir, "cn", "cn.ts"))).toBe(true);
  });
});
