import { randomUUID } from "node:crypto";
import { logger, projectRoot } from "../utils/index.js";

/** A parsed JSON frame (command response or event) from the pi RPC stream. */
export type RpcFrame = Record<string, unknown>;

/** A dialog-type `extension_ui_request` (select / input / confirm / editor). */
export interface UiRequest {
  id: string;
  method: string;
  title?: string;
  message?: string;
  options?: string[];
  placeholder?: string;
  prefill?: string;
  notifyType?: string;
}

/** Payload for one `extension_ui_response`; exactly one field is set. */
export interface UiResponsePayload {
  value?: string;
  confirmed?: boolean;
  cancelled?: boolean;
}

/** Handler callbacks the orchestrator attaches to one pi instance. */
export interface RpcHandlers {
  /** Called for every agent event (`message_update`, `tool_execution_*`, …). */
  onEvent: (event: RpcFrame) => void;
  /** Called for dialog `extension_ui_request`s; answered via `respondUi`. */
  onUiRequest: (request: UiRequest) => void;
  /** Called for fire-and-forget `extension_ui_request`s (`notify`, …). */
  onUiNotify: (request: UiRequest) => void;
}

/** Constructor options for one pi RPC instance. */
export interface PiRpcOptions {
  sessionName: string;
  model?: string;
  handlers: RpcHandlers;
}

/** Dialog methods that block until an `extension_ui_response` arrives. */
const DIALOG_METHODS = new Set(["select", "input", "confirm", "editor"]);

/** One pending command response keyed by its correlation id. */
interface PendingCommand {
  command: string;
  resolve: (response: RpcFrame) => void;
  reject: (error: Error) => void;
}

/**
 * A single `pi --mode rpc` child process.
 *
 * Owns the JSONL wire discipline (LF-only framing, trailing `\r` stripped,
 * `id`-correlated command responses), the dialog registry, and child-exit
 * detection: any exit before `dispose()` fails every pending waiter with an
 * error naming the exit code.
 */
export class PiRpc {
  private readonly handlers: RpcHandlers;
  private readonly proc: Bun.Subprocess<"pipe", "pipe", "inherit">;
  private readonly pendingCommands = new Map<string, PendingCommand>();
  private settled = false;
  private settleWaiter: { resolve: () => void; reject: (error: Error) => void } | null = null;
  private readonly exited: Promise<number>;
  private disposing = false;
  private disposed = false;

  /**
   * Spawn the pi child in RPC mode.
   *
   * Raw `Bun.spawn` instead of `execCommand`: the RPC child is a long-lived
   * bidirectional JSON stream (commands in, events out), not a one-shot
   * captured or inherited run — neither `execCommand` contract fits.
   *
   * @param options Session name, optional `-m` model pattern, and handlers.
   */
  public constructor(options: PiRpcOptions) {
    this.handlers = options.handlers;
    const args = ["--mode", "rpc", "-n", options.sessionName];
    if (options.model !== undefined) {
      args.push("-m", options.model);
    }
    this.proc = Bun.spawn(["pi", ...args], {
      cwd: projectRoot,
      stdin: "pipe",
      stdout: "pipe",
      stderr: "inherit",
    });
    this.exited = this.proc.exited;
    void this.exited.then((code: number): void => {
      this.failPending(new Error(`pi exited before settling (code ${code})`));
    });
    void this.readLoop();
  }

  /** Send the initial prompt and reset the settle tracker. */
  public async prompt(message: string): Promise<void> {
    this.settled = false;
    const response = await this.send({ type: "prompt", message });
    this.expectSuccess(response, "prompt");
  }

  /**
   * Resolve when the agent is fully settled.
   *
   * Waits on `agent_settled` (not `agent_end`): retries, compaction, and
   * queued continuations may still follow a low-level end. Resolves
   * immediately if the run already settled since the last prompt.
   */
  public waitForSettled(): Promise<void> {
    if (this.settled) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve: () => void, reject: (error: Error) => void): void => {
      this.settleWaiter = { resolve, reject };
    });
  }

  /** Queue a steering message into the active run. */
  public async steer(message: string): Promise<void> {
    const response = await this.send({ type: "steer", message });
    this.expectSuccess(response, "steer");
  }

  /** Abort the active run. */
  public async abort(): Promise<void> {
    const response = await this.send({ type: "abort" });
    this.expectSuccess(response, "abort");
  }

  /** Fetch the last assistant message's text content. */
  public async getLastAssistantText(): Promise<string> {
    const response = await this.send({ type: "get_last_assistant_text" });
    this.expectSuccess(response, "get_last_assistant_text");
    const data = response["data"] as { text?: unknown } | undefined;
    return typeof data?.text === "string" ? data.text : "";
  }

  /** Answer a dialog `extension_ui_request` by its id. */
  public respondUi(id: string, payload: UiResponsePayload): void {
    this.write({ type: "extension_ui_response", id, ...payload });
  }

  /**
   * Terminate the child: SIGTERM, then SIGKILL if it lingers.
   * Resolves once the process is reaped.
   */
  public async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }
    this.disposing = true;
    this.disposed = true;
    this.proc.kill();
    const killTimer = setTimeout((): void => {
      this.proc.kill("SIGKILL");
    }, 2000);
    await this.exited;
    clearTimeout(killTimer);
  }

  /**
   * Write one JSON command line and await its correlated response.
   *
   * @param frame Command frame without an id; a fresh id is attached.
   * @returns The matching `response` frame.
   */
  private send(frame: Record<string, unknown>): Promise<RpcFrame> {
    const id = randomUUID();
    return new Promise<RpcFrame>((resolve: (f: RpcFrame) => void, reject: (e: Error) => void): void => {
      this.pendingCommands.set(id, { command: String(frame["type"]), resolve, reject });
      this.write({ ...frame, id });
    });
  }

  /** Serialize a frame as one LF-terminated JSON line. */
  private write(frame: Record<string, unknown>): void {
    this.proc.stdin.write(JSON.stringify(frame) + "\n");
    this.proc.stdin.flush();
  }

  /** Fail every pending waiter (child exit or protocol breach). */
  private failPending(error: Error): void {
    for (const pending of this.pendingCommands.values()) {
      pending.reject(new Error(`${error.message} (pending command: ${pending.command})`));
    }
    this.pendingCommands.clear();
    const waiter = this.settleWaiter;
    this.settleWaiter = null;
    if (waiter !== null) {
      waiter.reject(error);
    }
  }

  /** Reject unless a response frame reports success. */
  private expectSuccess(response: RpcFrame, command: string): void {
    if (response["success"] !== true) {
      throw new Error(`pi command "${command}" failed: ${String(response["error"] ?? "unknown error")}`);
    }
  }

  /**
   * Read stdout under strict JSONL framing.
   *
   * Records split on `\n` only (never on U+2028/U+2029, which are valid
   * inside JSON strings); a trailing `\r` is stripped per record.
   */
  private async readLoop(): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of this.proc.stdout) {
      buffer += decoder.decode(chunk as Uint8Array, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.length > 0) {
          this.handleLine(line);
        }
        newline = buffer.indexOf("\n");
      }
    }
  }

  /** Dispatch one parsed frame: response, extension UI request, or event. */
  private handleLine(line: string): void {
    let frame: unknown;
    try {
      frame = JSON.parse(line);
    } catch {
      logger.warn(`pi stdout (non-JSON): ${line}`);
      return;
    }
    if (typeof frame !== "object" || frame === null) {
      return;
    }
    const record = frame as RpcFrame;
    if (record["type"] === "response") {
      const pending = this.pendingCommands.get(String(record["id"]));
      if (pending !== undefined) {
        this.pendingCommands.delete(String(record["id"]));
        pending.resolve(record);
      }
      return;
    }
    if (record["type"] === "extension_ui_request") {
      const request = record as unknown as UiRequest;
      if (DIALOG_METHODS.has(request.method)) {
        this.handlers.onUiRequest(request);
      } else {
        this.handlers.onUiNotify(request);
      }
      return;
    }
    if (record["type"] === "agent_settled") {
      this.settled = true;
      const waiter = this.settleWaiter;
      this.settleWaiter = null;
      if (waiter !== null) {
        waiter.resolve();
      }
    }
    this.handlers.onEvent(record);
  }
}
