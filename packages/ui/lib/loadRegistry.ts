import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RegistryManifest } from "./types";

/**
 * Absolute path to the shipped registry folder. Anchored one level up from this
 * file: every runtime form (lib source, per-module `dist/*.js`, flattened
 * `dist/bundle.js`) evaluates `import.meta.dir` at the package's `dist/` root
 * because per-module bundling inlines `internal/` imports one level up.
 * @internal
 */
export const REGISTRY_DIR = join(import.meta.dir, "..", "registry");

/**
 * Loads the registry manifest shipped with the package.
 * @returns Parsed manifest, entries keyed by component name.
 */
export function loadRegistry(): RegistryManifest {
  return JSON.parse(readFileSync(join(REGISTRY_DIR, "registry.json"), "utf8")) as RegistryManifest;
}
