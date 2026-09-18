import { join } from "node:path";

const bin = join(import.meta.dir, "..", "..", "bin", "hellajs-ui.js");

/**
 * Spawns the CLI bin against a project root and returns [exitCode, stdout].
 * Stderr is dropped: peer warnings and skip notices are asserted nowhere.
 * @param args CLI arguments, command name first.
 * @param root Project root the process runs in.
 * @returns Tuple of exit code and captured stdout.
 */
export async function runCli(args: string[], root: string): Promise<[number, string]> {
  const proc = Bun.spawn(["bun", bin, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  const exit = await proc.exited;
  return [exit, stdout];
}
