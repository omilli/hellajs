import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { UiConfig, UiFormat, UiLang, UiStyle, UiThemeMode } from "../types";

/**
 * Config written by `init` and read when no explicit value is given.
 * @internal
 */
export const DEFAULT_CONFIG: UiConfig = {
  componentsDir: "src/components",
  style: "css",
  format: "jsx",
  themeMode: "light",
  lang: "ts",
};

/**
 * Valid registry styles, shared by config and add validation. `css` composes
 * classes through `@hellajs/css` scoped classes under the `hella` cascade
 * layer; `tailwind` composes through the shared `cn` helper over a plain
 * palette stylesheet.
 * @internal
 */
export const UI_STYLES: UiStyle[] = ["css", "tailwind"];

/**
 * Valid theme palettes, shared by config and add validation. `light` copies
 * the tokens sheet registering the light palette plus the `.dark` class
 * remap; `dark` copies the dark-only sheet with no remap (css style only).
 * @internal
 */
export const UI_THEME_MODES: UiThemeMode[] = ["light", "dark"];

/**
 * Valid source formats, shared by config and add validation.
 * @internal
 */
export const UI_FORMATS: UiFormat[] = ["jsx", "html"];

/**
 * Valid output languages, shared by config and add validation. `ts` copies
 * TypeScript source verbatim; `js` strips types at copy time through esbuild.
 * @internal
 */
export const UI_LANGS: UiLang[] = ["js", "ts"];

/**
 * Resolves the target project root.
 * @param dir Explicit project root. Process cwd when absent.
 * @returns Absolute project root path.
 * @internal
 */
export function resolveRoot(dir?: string): string {
  return dir === undefined ? process.cwd() : resolve(dir);
}

/**
 * Reads hella.ui.json from the project root, falling back to defaults per field.
 * @param dir Project root. Process cwd when absent.
 * @returns The merged config.
 * @throws {Error} When the file holds invalid JSON or an invalid style, format, themeMode, or lang.
 */
export function readConfig(dir?: string): UiConfig {
  const configPath = join(resolveRoot(dir), "hella.ui.json");
  if (!existsSync(configPath)) {
    return { ...DEFAULT_CONFIG };
  }
  let raw: Partial<UiConfig>;
  try {
    raw = JSON.parse(readFileSync(configPath, "utf8")) as Partial<UiConfig>;
  } catch (error) {
    throw new Error(`[ui] readConfig: invalid JSON in ${configPath}: ${(error as Error).message}`, { cause: error });
  }
  const style = raw.style ?? DEFAULT_CONFIG.style;
  const format = raw.format ?? DEFAULT_CONFIG.format;
  const themeMode = raw.themeMode ?? DEFAULT_CONFIG.themeMode;
  const lang = raw.lang ?? DEFAULT_CONFIG.lang;
  if (!UI_STYLES.includes(style)) {
    throw new Error(`[ui] readConfig: style must be one of css, tailwind, received "${String(raw.style)}"`);
  }
  if (!UI_FORMATS.includes(format)) {
    throw new Error(`[ui] readConfig: format must be jsx or html, received "${String(raw.format)}"`);
  }
  if (!UI_THEME_MODES.includes(themeMode)) {
    throw new Error(`[ui] readConfig: themeMode must be light or dark, received "${String(raw.themeMode)}"`);
  }
  if (!UI_LANGS.includes(lang)) {
    throw new Error(`[ui] readConfig: lang must be js or ts, received "${String(raw.lang)}"`);
  }
  return {
    componentsDir: raw.componentsDir ?? DEFAULT_CONFIG.componentsDir,
    style,
    format,
    themeMode,
    lang,
  };
}
