import { describe, test, expect } from "vite-plus/test";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const distRegistry = join(import.meta.dirname, "..", "dist", "registry");
const sourceRegistry = join(import.meta.dirname, "..", "registry");

/** Compiled artifact text under dist/registry. */
function readArtifact(...parts: string[]): string {
  return readFileSync(join(distRegistry, ...parts), "utf8");
}

/** Asserts a dist/registry artifact exists. */
function expectArtifact(...parts: string[]): void {
  expect(existsSync(join(distRegistry, ...parts))).toBe(true);
}

describe("compile", () => {
  test("emits every button variant with declarations plus theme and cn artifacts", () => {
    for (const style of ["css", "tailwind"]) {
      expectArtifact("button", style, "button.js");
      expectArtifact("button", style, "button.d.ts");
    }
    expectArtifact("button", "tailwind", "cn.js");
    expectArtifact("theme", "tokens.js");
    expectArtifact("theme", "tokens.dark.js");
    expectArtifact("theme", "theme.css");
    expectArtifact("cn", "cn.js");
  });

  test("button declarations carry the inlined ButtonProps and no artifact references the types module", () => {
    for (const style of ["css", "tailwind"]) {
      expectArtifact("button", style, "button.d.ts");
      expect(readArtifact("button", style, "button.d.ts")).toContain("ButtonProps");
    }
    const leaked: string[] = [];
    const walk = (dir: string): void => {
      for (const item of readdirSync(dir)) {
        const at = join(dir, item);
        if (statSync(at).isDirectory()) walk(at);
        else if (readFileSync(at, "utf8").includes("-types.js")) leaked.push(at);
      }
    };
    walk(join(distRegistry, "button"));
    expect(leaked).toEqual([]);
  });

  test("emits plain javascript with verbatim external imports and no injected runtime", () => {
    const cssJsx = readArtifact("button", "css", "button.js");
    const tailwindJsx = readArtifact("button", "tailwind", "button.js");
    for (const compiled of [cssJsx, tailwindJsx]) {
      expect(compiled).not.toMatch(/\binterface\b|\bimport type\b|: ButtonProps|as HellaNode/);
      expect(compiled).not.toMatch(/\bReact\b|createElement/);
    }
    expect(cssJsx).toContain(`import { style } from "@hellajs/css";`);
    expect(cssJsx).toContain(`import { tokens } from "../../theme/tokens.js";`);
    expect(cssJsx).not.toContain("@hellajs/dom");
    expect(tailwindJsx).toContain(`import { cn } from "./cn.js";`);
    expect(tailwindJsx).not.toContain("@hellajs/");
    expect(readArtifact("cn", "cn.js")).toContain(`import { clsx } from "clsx";`);
  });

  test("composes tailwind variants through cn and css variants through unlayered style", () => {
    const tailwindJsx = readArtifact("button", "tailwind", "button.js");
    const cssJsx = readArtifact("button", "css", "button.js");
    expect(tailwindJsx).toContain(
      `class: () => cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", variants[variant ?? "default"], sizes[size ?? "default"], cls)`,
    );
    expect(tailwindJsx).not.toContain("@hellajs/css");
    expect(cssJsx).toContain(
      `class: [base, variants[variant ?? "default"], sizes[size ?? "default"], cls]`,
    );
    expect(cssJsx.includes('layer: "hella"')).toBe(false);
    expect(cssJsx).toContain("style(");
  });

  test("emits every named part of the multi-part canonicals with declarations", () => {
    for (const style of ["css", "tailwind"]) {
      for (const name of ["card", "dialog", "tabs"]) {
        expectArtifact(name, style, `${name}.js`);
        expectArtifact(name, style, `${name}.d.ts`);
      }
      expect(readArtifact("card", style, "card.js")).toContain("CardHeader");
      expect(readArtifact("card", style, "card.js")).toContain("CardFooter");
      expect(readArtifact("card", style, "card.d.ts")).toContain("CardAction");
      expect(readArtifact("dialog", style, "dialog.js")).toContain("DialogOverlay");
      expect(readArtifact("dialog", style, "dialog.js")).toContain("DialogClose");
      expect(readArtifact("dialog", style, "dialog.d.ts")).toContain("DialogTitle");
      expect(readArtifact("tabs", style, "tabs.js")).toContain("TabsList");
      expect(readArtifact("tabs", style, "tabs.js")).toContain("TabsTrigger");
      expect(readArtifact("tabs", style, "tabs.d.ts")).toContain("TabsContent");
    }
  });

  test("compiles the theme sheets with their token export and copies the stylesheet verbatim", () => {
    // The sheets compile from tokens.ts / tokens.dark.ts (staged sources), so
    // their dist output is compiled JavaScript carrying the camelCase export;
    // theme.css has no TS to strip and copies byte-identical.
    const tokensJs = readArtifact("theme", "tokens.js");
    expect(tokensJs).toContain(`import { css, vars } from "@hellajs/css";`);
    expect(tokensJs).toContain("cardForeground");
    expect(tokensJs).toContain('"--card-foreground"');
    expect(readArtifact("theme", "tokens.dark.js")).toContain("cardForeground");
    expect(readArtifact("theme", "tokens.dark.d.ts")).toContain("tokens");
    expect(readArtifact("theme", "tokens.d.ts")).toContain("tokens");
    expect(readArtifact("theme", "theme.css")).toBe(
      readFileSync(join(sourceRegistry, "theme", "theme.css"), "utf8"),
    );
  });
});
