import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Warns when the target project is missing npm packages the copied source
 * imports. Names exactly the absent ones in the install hint.
 * @param dir Project root containing package.json.
 * @param deps Peer package names required by the copied source.
 * @throws {Error} When no package.json exists in dir or it holds invalid JSON.
 * @internal
 */
export function checkPeers(dir: string, deps: string[]): void {
  const manifestPath = join(dir, "package.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`[ui] checkPeers: package.json not found in ${dir}, run inside a project root`);
  }
  let manifest: {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as typeof manifest;
  } catch (error) {
    throw new Error(`[ui] checkPeers: invalid JSON in ${manifestPath}: ${(error as Error).message}`, { cause: error });
  }
  const installed = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies };
  const missing = deps.filter((dep) => !Object.hasOwn(installed, dep));
  if (missing.length > 0) {
    console.warn(`[ui] checkPeers: missing packages the copied source imports: ${missing.join(", ")}
install them before building:

  bun add ${missing.join(" ")}`);
  }
}
