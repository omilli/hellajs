import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addComponent } from "./addComponent";
import { DEFAULT_CONFIG, readConfig, resolveRoot } from "./internal/config";
import type { InitOptions } from "./types";

/**
 * Writes hella.ui.json with defaults unless one is present (or --force), then
 * adds the `theme` entry through `addComponent` — `tokens.js` for the css
 * style, `theme.css` plus the shared `cn` helper for tailwind.
 * @param options Init options.
 * @throws {Error} When the config cannot be written or the theme entry cannot
 * be added.
 */
export function initProject(options: InitOptions = {}): void {
  const root = resolveRoot(options.dir);
  const configPath = join(root, "hella.ui.json");
  if (existsSync(configPath) && options.force !== true) {
    console.warn(`[ui] initProject: hella.ui.json already exists in ${root}, keeping it (pass --force to rewrite)`);
  } else {
    writeFileSync(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`);
  }
  const entries = readConfig(options.dir).style === "tailwind" ? ["theme", "cn"] : ["theme"];
  addComponent(entries, { dir: options.dir });
}
