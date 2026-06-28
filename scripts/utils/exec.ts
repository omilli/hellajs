import { spawn, type StdioOptions } from "node:child_process";

export interface ExecOptions {
  timeout?: number;
  stdio?: StdioOptions;
  [key: string]: unknown;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export function execCommand(
  command: string,
  args: string[] = [],
  options: ExecOptions = {},
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const {
      timeout = 120000,
      stdio = ["pipe", "pipe", "pipe"] as StdioOptions,
      ...spawnOptions
    } = options;

    const child = spawn(command, args, {
      stdio,
      ...spawnOptions,
    });

    let stdout = "",
      stderr = "",
      timer: ReturnType<typeof setTimeout>;

    if (timeout) {
      timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(
          new Error(
            `Command timed out after ${timeout}ms: ${command} ${args.join(" ")}`,
          ),
        );
      }, timeout);
    }

    child.stdout?.on("data", (data: string) => {
      stdout += data;
    });

    child.stderr?.on("data", (data: string) => {
      stderr += data;
    });

    child.on("close", (code: number | null) => {
      if (timer) clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr, code });
      } else {
        reject(
          new Error(
            `Command failed with code ${code}: ${command} ${args.join(" ")}\nStdout: ${stdout}\nStderr: ${stderr}`,
          ),
        );
      }
    });

    child.on("error", (error: Error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });
  });
}

export function execCommandInherited(
  command: string,
  args: string[] = [],
  options: Record<string, unknown> = {},
): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit" as const,
      ...options,
    });

    child.on("close", (code: number | null) => {
      if (code === 0) {
        resolve({ code } as ExecResult);
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on("error", (error: Error) => {
      reject(error);
    });
  });
}
