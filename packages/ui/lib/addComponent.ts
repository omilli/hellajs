import { readFileSync } from "node:fs";
import { join } from "node:path";
import { copyFiles } from "./internal/copy";
import { readConfig, resolveRoot, UI_FORMATS, UI_LANGS, UI_STYLES, UI_THEME_MODES } from "./internal/config";
import { checkPeers } from "./internal/peers";
import { resolveEntry } from "./internal/registry";
import { stripTypes } from "./internal/strip";
import { applyStyleVariant } from "./internal/transform";
import { loadRegistry } from "./loadRegistry";
import type { AddOptions, UiFormat, UiThemeMode } from "./types";

/**
 * Checks a file against the requested source format: `.tsx` copies for JSX,
 * `*-html.ts` copies for runtime `html` templates, anything else (shared
 * helpers, theme sheets) always.
 */
function matchesFormat(file: string, format: UiFormat): boolean {
  if (file.endsWith(".tsx")) return format === "jsx";
  if (file.endsWith("-html.ts")) return format === "html";
  return true;
}

/**
 * Copies registry component source into the project's components directory.
 * Style, format, themeMode, and lang come from the options, falling back to
 * hella.ui.json, then defaults. Component entries have their style module
 * (`<name>-<style>.ts`) spliced into every copied canonical file — both
 * styles splice; entries without canonicals (theme, cn) copy verbatim. A
 * `js` lang strips TypeScript after the splice through esbuild: `.tsx`
 * becomes `.jsx` with JSX preserved, `.ts` becomes plain `.js` (the theme
 * `tokens.ts` included), and `theme.css` rides through verbatim. A `dark`
 * themeMode swaps
 * every file the resolved entry maps in `darkFiles` for its dark source at
 * copy time (target filename unchanged), so the theme entry emits the
 * dark-only tokens sheet; it supports the css style only. Registry
 * dependencies of the chosen style are resolved recursively and copied
 * alongside; the peer check prints an install hint naming exactly the
 * packages missing from the target project.
 * @param names Registry component names, e.g. "button" or "theme".
 * @param options Add options. Unspecified values come from hella.ui.json.
 * @throws {Error} When names is empty, a style, format, themeMode, or lang is
 * invalid, a dark themeMode meets the tailwind style, a name is not in the
 * registry, a style is unavailable for the component, or the target project
 * has no package.json for the peer check.
 */
export function addComponent(names: string[], options: AddOptions = {}): void {
  if (names.length === 0) {
    throw new Error("[ui] addComponent: at least one component name is required");
  }
  const config = readConfig(options.dir);
  const style = options.style ?? config.style;
  const format = options.format ?? config.format;
  const lang = options.lang ?? config.lang;
  const themeMode: UiThemeMode = options.themeMode ?? config.themeMode;
  if (!UI_STYLES.includes(style)) {
    throw new Error(`[ui] addComponent: style must be one of css, tailwind, received "${String(options.style)}"`);
  }
  if (!UI_FORMATS.includes(format)) {
    throw new Error(`[ui] addComponent: format must be jsx or html, received "${String(options.format)}"`);
  }
  if (!UI_THEME_MODES.includes(themeMode)) {
    throw new Error(`[ui] addComponent: themeMode must be light or dark, received "${String(options.themeMode)}"`);
  }
  if (!UI_LANGS.includes(lang)) {
    throw new Error(`[ui] addComponent: lang must be js or ts, received "${String(options.lang)}"`);
  }
  if (themeMode === "dark" && style === "tailwind") {
    throw new Error(`[ui] addComponent: themeMode "dark" supports the css style only, received style "tailwind"`);
  }
  const root = resolveRoot(options.dir);
  const manifest = loadRegistry();
  const resolved = names.flatMap((name) => resolveEntry(manifest, name, style));
  const deps = [...new Set(resolved.flatMap((entry) => entry.deps))];
  checkPeers(root, deps);
  const componentsDir = join(root, config.componentsDir);
  let i = 0;
  while (i < resolved.length) {
    const entry = resolved[i++]!;
    const styleModuleText = entry.styleFile === undefined ? undefined : readFileSync(join(entry.baseDir, entry.styleFile), "utf8");
    // *-html.ts renames to <name>.ts (js for --lang js) so user imports resolve
    // ./components/<name> in both formats; --lang js retargets the other TS files too.
    // A dark themeMode reads the mapped dark source instead of the target file
    // (tokens.dark.ts in) and renames it back (tokens.ts out) - the file set is
    // identical to the light copy.
    const rename: Record<string, string> = {};
    const copied: string[] = [];
    let f = 0;
    const fLen = entry.files.length;
    while (f < fLen) {
      const file = entry.files[f++]!;
      const darkSource = themeMode === "dark" ? entry.darkFiles?.[file] : undefined;
      if (darkSource !== undefined) {
        copied.push(darkSource);
        rename[darkSource] = file;
        continue;
      }
      copied.push(file);
      if (file.endsWith("-html.ts")) {
        rename[file] = `${file.slice(0, -"-html.ts".length)}.${lang === "js" ? "js" : "ts"}`;
      } else if (lang === "js" && file.endsWith(".tsx")) {
        rename[file] = `${file.slice(0, -".tsx".length)}.jsx`;
      } else if (lang === "js" && file.endsWith(".ts")) {
        rename[file] = `${file.slice(0, -".ts".length)}.js`;
      }
    }
    copyFiles(
      entry.baseDir,
      copied.filter((file) => matchesFormat(file, format)),
      componentsDir,
      options.overwrite === true,
      {
        rename,
        transform: (text: string, file: string): string => {
          const spliced = styleModuleText === undefined ? text : applyStyleVariant(text, styleModuleText, style);
          return lang === "js" ? stripTypes(spliced, file) : spliced;
        },
      },
    );
  }
}
