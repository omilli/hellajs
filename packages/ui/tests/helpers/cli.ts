import { execFile } from "node:child_process";
import { join } from "node:path";

const bin = join(import.meta.dirname, "..", "..", "bin", "hellajs-ui.js");

/**
 * Spawns the CLI bin against a project root and returns [exitCode, stdout].
 * Stderr is dropped: peer warnings and skip notices are asserted nowhere.
 * @param args CLI arguments, command name first.
 * @param root Project root the process runs in.
 * @returns Tuple of exit code and captured stdout.
 */
export async function runCli(args: string[], root: string): Promise<[number, string]> {
  return new Promise((resolve) => {
    execFile(process.execPath, [bin, ...args], { cwd: root, encoding: "utf8" }, (error, stdout) => {
      resolve([error && typeof error.code === "number" ? error.code : error ? 1 : 0, stdout]);
    });
  });
}
