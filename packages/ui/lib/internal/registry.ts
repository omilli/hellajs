import { join } from "node:path";
import { REGISTRY_DIR } from "../loadRegistry";
import type { RegistryManifest, UiStyle } from "../types";

/**
 * One component's resolved copy plan at a style: the shared files unioned
 * with the style slot's own files, the unioned runtime deps, the registry
 * folder holding them, the conventionally named style module
 * (`<name>-<style>.ts`) for component entries — spliced at copy time, never
 * copied as a file — and the slot's darkFiles substitution when the slot
 * declares one (dark themeMode copies the mapped source in place of the
 * target file).
 * @internal
 */
export interface ResolvedEntry {
  name: string;
  baseDir: string;
  files: string[];
  deps: string[];
  styleFile?: string;
  /** Dark-default source files keyed by the target file they replace, threaded from the style slot; present only when the slot declares one. */
  darkFiles?: Record<string, string>;
}

/**
 * Resolves a component's copy plan at a style: one entry per component in the
 * recursion (own resolution first, then each registryDependency), every entry
 * carrying its own baseDir, files, and deps. Entry-level `files`/`deps` are
 * the shared delta-free fields; the style slot contributes its own extras on
 * top. Component entries (those with shared files) own a style module named
 * `<name>-<style>.ts` by convention. Style-scoped shared entries (theme, cn)
 * keep everything in their slot. Diamond fan-out (two dependencies sharing a
 * sub-dependency) resolves the shared entry once; only a name revisited while
 * still on the resolution path is a cycle.
 * @param manifest Parsed registry manifest.
 * @param name Component name to resolve.
 * @param style Registry style variant.
 * @param seen Names resolved anywhere in this traversal. Dedupe guard.
 * @param path Names on the current resolution path. Cycle guard.
 * @returns The resolved copy plans, dependency entries appended after their dependents.
 * @throws {Error} When the name is unknown, the style is unavailable for the component, or a dependency cycle exists.
 * @internal
 */
export function resolveEntry(
  manifest: RegistryManifest,
  name: string,
  style: UiStyle,
  seen: Set<string> = new Set(),
  path: Set<string> = new Set(),
): ResolvedEntry[] {
  if (path.has(name)) {
    throw new Error(`[ui] resolveEntry: registry dependency cycle at "${name}"`);
  }
  if (seen.has(name)) return [];
  seen.add(name);
  path.add(name);
  const entry = manifest.entries[name];
  if (entry === undefined) {
    throw new Error(`[ui] resolveEntry: component "${name}" not found in registry`);
  }
  const styled = entry.styles === undefined ? undefined : entry.styles[style];
  if (entry.styles !== undefined && styled === undefined) {
    throw new Error(`[ui] resolveEntry: component "${name}" has no "${style}" style`);
  }
  const files = [...(entry.files ?? []), ...(styled?.files ?? [])];
  const deps = [...(entry.deps ?? []), ...(styled?.deps ?? [])];
  const regDeps = styled?.registryDependencies ?? [];
  const resolved: ResolvedEntry = { name, baseDir: join(REGISTRY_DIR, name), files, deps };
  if ((entry.files ?? []).length > 0) resolved.styleFile = `${name}-${style}.ts`;
  if (styled?.darkFiles !== undefined) resolved.darkFiles = styled.darkFiles;
  const plans: ResolvedEntry[] = [resolved];
  let i = 0;
  while (i < regDeps.length) {
    const dep = regDeps[i]!;
    i++;
    plans.push(...resolveEntry(manifest, dep, style, seen, path));
  }
  path.delete(name);
  return plans;
}
