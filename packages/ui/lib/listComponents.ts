import { loadRegistry } from "./loadRegistry";

/**
 * Lists the registry's component names.
 * @returns Component names, sorted.
 */
export function listComponents(): string[] {
  return Object.keys(loadRegistry().entries).sort();
}
