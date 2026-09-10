/**
 * Run supervision for the remote daemon (`scripts/remote/server.ts`).
 *
 * One {@link RunSupervisor} owns every daemon-spawned child: exact argv, raw
 * `Bun.spawn`, live output streaming, stdin writes, and kill. Merged
 * stdout/stderr is tee'd per run into `<stateDir>/logs/<id>.log`.
 */

import { appendFile } from "node:fs/promises";
import path from "node:path";
import { ensureDir, projectRoot } from "../utils/index.js";

/** One supervised run as the registry and the panel see it. */
export interface RunRecord {
  id: string;
  command: string;
  startedAt: number;
  kind: string;
  ref: string;
}

/** Metadata tagging who started a run (drives the launcher's guards). */
export interface RunMeta {
  kind: string;
  ref: string;
}

/** Constructor wiring for {@link RunSupervisor}. */
export interface SupervisorOptions {
  /** Directory receiving the per-run merged output logs. */
  logsDir: string;
  /** Env vars merged into every child, keyed by its run id (dial-home pair). */
  childEnv: (runId: string) => Record<string, string>;
  /** Called for every stdout/stderr chunk of every live run. */
  onOutput: (run: RunRecord, chunk: string) => void;
  /** Called once per run with its exit code, after registry removal. */
  onExit: (run: RunRecord, code: number) => void;
}

/** One registry entry: the public record plus the owned child process. */
interface RunEntry {
  record: RunRecord;
  proc: Bun.Subprocess<"pipe", "pipe", "pipe">;
}

/**
 * Spawns and supervises daemon children.
 *
 * Raw `Bun.spawn` instead of `execCommand`: supervised children are
 * long-lived bidirectional streams (live output out, writable stdin in),
 * not one-shot captured or inherited runs — the same contract reason as
 * `PiRpc`'s constructor (`scripts/agent/rpc.ts`). Max one child per
 * `start` call; no reaping loop is needed because each child is awaited
 * through its own `proc.exited` promise, which fires the exit callback and
 * removes the registry entry.
 */
export class RunSupervisor {
  private readonly options: SupervisorOptions;
  private readonly runs = new Map<string, RunEntry>();
  private nextId = 1;

  /**
   * @param options Log directory plus the output/exit callbacks.
   */
  public constructor(options: SupervisorOptions) {
    this.options = options;
  }

  /**
   * Spawn one child and register it.
   *
   * @param command Exact argv (no shell) run at the project root.
   * @param meta Launch kind and ref tagging the run for the guards.
   * @returns The registered run record.
   */
  public async start(command: string[], meta: RunMeta): Promise<RunRecord> {
    await ensureDir(this.options.logsDir);
    const id = `run-${this.nextId}`;
    this.nextId += 1;
    const proc = Bun.spawn(command, {
      cwd: projectRoot,
      env: { ...process.env, ...this.options.childEnv(id) },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    const record: RunRecord = {
      id,
      command: command.join(" "),
      startedAt: Date.now(),
      kind: meta.kind,
      ref: meta.ref,
    };
    this.runs.set(id, { record, proc });
    void this.pump(proc.stdout, record);
    void this.pump(proc.stderr, record);
    void proc.exited.then((code: number): void => {
      this.runs.delete(id);
      this.options.onExit(record, code);
    });
    return record;
  }

  /**
   * Write one line to a live run's stdin.
   *
   * @param id Run id from the registry.
   * @param line Text written with a trailing newline.
   * @returns True when the run was live and received the line.
   */
  public writeStdin(id: string, line: string): boolean {
    const entry = this.runs.get(id);
    if (entry === undefined) {
      return false;
    }
    entry.proc.stdin.write(line + "\n");
    entry.proc.stdin.flush();
    return true;
  }

  /**
   * Kill a live run: SIGTERM, then SIGKILL after 2s if it lingers.
   *
   * Fire-and-forget (the `PiRpc` dispose pattern): the exit callback fires
   * from the `proc.exited` promise, not from this call.
   *
   * @param id Run id from the registry.
   * @returns True when a live run received the signal.
   */
  public kill(id: string): boolean {
    const entry = this.runs.get(id);
    if (entry === undefined) {
      return false;
    }
    this.terminate(entry);
    return true;
  }

  /**
   * List the live runs (exited runs leave the registry).
   *
   * @returns Live run records in start order.
   */
  public list(): RunRecord[] {
    return [...this.runs.values()].map((entry: RunEntry): RunRecord => entry.record);
  }

  /**
   * Terminate every live child and resolve once all are reaped.
   *
   * Used by server shutdown (SIGINT, probe teardown): the exit callbacks
   * still fire, so clients observe the `exited` frames.
   */
  public async dispose(): Promise<void> {
    const entries = [...this.runs.values()];
    for (const entry of entries) {
      this.terminate(entry);
    }
    await Promise.all(entries.map((entry: RunEntry): Promise<number> => entry.proc.exited));
  }

  /**
   * SIGTERM a child, escalating to SIGKILL after 2s if it survives.
   *
   * @param entry Registry entry owning the child process.
   */
  private terminate(entry: RunEntry): void {
    entry.proc.kill();
    const killTimer = setTimeout((): void => {
      entry.proc.kill("SIGKILL");
    }, 2000);
    void entry.proc.exited.then((): void => {
      clearTimeout(killTimer);
    });
  }

  /**
   * Stream one child output pipe: tee to the run log, then broadcast.
   *
   * @param stream The piped stdout or stderr readable stream.
   * @param record The run the stream belongs to.
   */
  private async pump(stream: ReadableStream<Uint8Array>, record: RunRecord): Promise<void> {
    const decoder = new TextDecoder();
    const logPath = path.join(this.options.logsDir, `${record.id}.log`);
    for await (const chunk of stream) {
      const text = decoder.decode(chunk as Uint8Array, { stream: true });
      if (text.length === 0) {
        continue;
      }
      await appendFile(logPath, text);
      this.options.onOutput(record, text);
    }
  }
}
