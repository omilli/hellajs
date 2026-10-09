import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addComponent } from "./addComponent";
import { DEFAULT_CONFIG, readConfig, resolveRoot, UI_THEME_MODES } from "./internal/config";
import type { InitOptions } from "./types";

/**
 * Writes hella.ui.json with defaults unless one is present (or --force), then
 * adds the `theme` entry through `addComponent` — `tokens.ts` for the css
 * style, `theme.css` plus the shared `cn` helper for tailwind. A `themeMode`
 * option persists into the written config (the dark mode selects the
 * dark-only tokens sheet) and flows into the theme add. An invalid themeMode
 * throws before anything is written.
 * @param options Init options.
 * @throws {Error} When themeMode is invalid, the config cannot be written, or
 * the theme entry cannot be added.
 */
export function initProject(options: InitOptions = {}): void {
  if (options.themeMode !== undefined && !UI_THEME_MODES.includes(options.themeMode)) {
    throw new Error(`[ui] initProject: themeMode must be light or dark, received "${String(options.themeMode)}"`);
  }
  const root = resolveRoot(options.dir);
  const configPath = join(root, "hella.ui.json");
  if (existsSync(configPath) && options.force !== true) {
    console.warn(`[ui] initProject: hella.ui.json already exists in ${root}, keeping it (pass --force to rewrite)`);
  } else {
    writeFileSync(configPath, `${JSON.stringify({ ...DEFAULT_CONFIG, ...(options.themeMode ? { themeMode: options.themeMode } : {}) }, null, 2)}\n`);
  }
  const entries = readConfig(options.dir).style === "tailwind" ? ["theme", "cn"] : ["theme"];
  addComponent(entries, { dir: options.dir, themeMode: options.themeMode });
}
