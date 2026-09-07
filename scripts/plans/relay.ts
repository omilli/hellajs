import type { UiRequest, UiResponsePayload } from "./rpc.js";

/** Wiring the relay needs to steer or abort the active agent. */
export interface RelayOptions {
  /** True while an agent instance is running (steering is allowed). */
  isActive: () => boolean;
  /** Deliver a typed line to the active agent as a steering message. */
  onSteer: (message: string) => void;
  /** Abort the active agent (the `.stop` line). */
  onAbort: () => void;
}

/** A dialog (or orchestrator prompt) waiting for the next input line. */
interface PendingDialog {
  onLine: (line: string) => void;
}

/** The active dialog, if any. The agent side serializes dialogs. */
let dialog: PendingDialog | null = null;

/** True once the single stdin line-reader loop has started. */
let stdinStarted = false;

/** Whether ANSI styling is safe for the current stdout. */
const isTty = typeof process.stdout.isTTY === "boolean" ? process.stdout.isTTY : false;

/** Dim ANSI wrapper for hint lines. */
function dim(text: string): string {
  return isTty ? `\x1b[2m${text}\x1b[0m` : text;
}

/**
 * Start the one shared stdin line-reader.
 *
 * Idempotent: the loop is started once per process; every later line is
 * routed through {@link TerminalRelay.handleLine} of the live relay.
 */
function startStdin(onLine: (line: string) => void): void {
  if (stdinStarted) {
    return;
  }
  stdinStarted = true;
  const decoder = new TextDecoder();
  let buffer = "";
  void (async (): Promise<void> => {
    for await (const chunk of Bun.stdin.stream()) {
      buffer += decoder.decode(chunk as Uint8Array, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).replace(/\r$/, "");
        buffer = buffer.slice(newline + 1);
        if (line.length > 0 || dialog !== null) {
          onLine(line);
        }
        newline = buffer.indexOf("\n");
      }
    }
  })();
}

/**
 * Terminal relay: renders pi dialog requests, answers them, and routes
 * free-typed lines to steering while an agent runs.
 *
 * One line-reader feeds both paths: a line answers the pending dialog if
 * one is open; otherwise `.stop` aborts the agent, any other non-empty line
 * steers it while active, and idle lines are acknowledged and dropped.
 */
export class TerminalRelay {
  private readonly options: RelayOptions;

  /**
   * @param options Steering/abort wiring plus the active-run probe.
   */
  public constructor(options: RelayOptions) {
    this.options = options;
  }

  /** Start the shared stdin reader routed to this relay. */
  public start(): void {
    startStdin((line: string): void => {
      this.handleLine(line);
    });
  }

  /** Render a fire-and-forget request (`notify`, `setStatus`, …). */
  public notify(request: UiRequest): void {
    const text = request.message ?? request.title;
    if (text !== undefined) {
      console.log(dim(`· ${request.method}: ${text}`));
    }
  }

  /**
   * Render a dialog request and resolve with the operator's answer.
   *
   * Select answers reply with the exact option string (the extension parses
   * leading integers, but exact strings are the safe contract); `c` cancels
   * any dialog; `.cancel` cancels free-text (`input`) dialogs, where a plain
   * empty line is a deliberate empty commit on the extension's side.
   *
   * @param request A dialog-type `extension_ui_request`.
   * @returns The response payload to send back.
   */
  public ask(request: UiRequest): Promise<UiResponsePayload> {
    this.renderDialog(request);
    return new Promise<UiResponsePayload>((resolve: (response: UiResponsePayload) => void): void => {
      dialog = {
        onLine: (line: string): void => {
          this.answerDialog(request, line, resolve);
        },
      };
    });
  }

  /**
   * Ask an orchestrator-owned question (e.g. the failure gate).
   *
   * @param prompt Question text rendered before the answer arrow.
   * @returns The next input line, verbatim.
   */
  public askOrchestrator(prompt: string): Promise<string> {
    console.log(`? ${prompt}`);
    process.stdout.write("→ ");
    return new Promise<string>((resolve: (line: string) => void): void => {
      dialog = {
        onLine: (line: string): void => {
          dialog = null;
          resolve(line);
        },
      };
    });
  }

  /** Route one stdin line: pending dialog, abort, steer, or idle note. */
  private handleLine(line: string): void {
    const pending = dialog;
    if (pending !== null) {
      pending.onLine(line);
      return;
    }
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      return;
    }
    if (trimmed === ".stop") {
      this.options.onAbort();
      return;
    }
    if (this.options.isActive()) {
      this.options.onSteer(line);
      return;
    }
    console.log(dim(`(ignored: no agent active — ".stop" aborts an active agent)`));
  }

  /** Render a dialog by method. */
  private renderDialog(request: UiRequest): void {
    if (request.method === "select") {
      console.log(`? ${request.title ?? ""}`);
      for (const option of request.options ?? []) {
        console.log(`  ${option}`);
      }
      console.log(dim("  answer: option number or exact option text · c = cancel"));
      process.stdout.write("→ ");
      return;
    }
    if (request.method === "confirm") {
      console.log(`? ${request.title ?? ""}`);
      if (request.message !== undefined) {
        console.log(`  ${request.message}`);
      }
      console.log(dim("  answer: y / n · c = cancel"));
      process.stdout.write("→ ");
      return;
    }
    if (request.method === "editor") {
      console.log(`? ${request.title ?? ""} ${dim("(single-line edit)")}`);
      if (request.prefill !== undefined) {
        console.log(dim(`  prefill: ${request.prefill.replace(/\n/g, " ⏎ ")}`));
      }
      console.log(dim("  answer: one line · .cancel = cancel"));
      process.stdout.write("→ ");
      return;
    }
    console.log(`? ${request.title ?? ""}`);
    if (request.placeholder !== undefined && request.placeholder.length > 0) {
      console.log(dim(`  placeholder: ${request.placeholder}`));
    }
    console.log(dim("  answer: text (empty line = deliberate empty answer) · .cancel = cancel"));
    process.stdout.write("→ ");
  }

  /** Validate one answer line against the open dialog; re-prompt on mismatch. */
  private answerDialog(request: UiRequest, line: string, resolve: (response: UiResponsePayload) => void): void {
    if (line.trim() === "c") {
      dialog = null;
      resolve({ cancelled: true });
      return;
    }
    if (request.method === "select") {
      const options = request.options ?? [];
      const index = Number.parseInt(line, 10);
      if (Number.isInteger(index) && index >= 1 && index <= options.length) {
        dialog = null;
        resolve({ value: options[index - 1] });
        return;
      }
      if (options.includes(line)) {
        dialog = null;
        resolve({ value: line });
        return;
      }
      process.stdout.write(dim("  (number or exact option text) → "));
      return;
    }
    if (request.method === "confirm") {
      const answer = line.trim().toLowerCase();
      if (answer === "y" || answer === "yes") {
        dialog = null;
        resolve({ confirmed: true });
        return;
      }
      if (answer === "n" || answer === "no") {
        dialog = null;
        resolve({ confirmed: false });
        return;
      }
      process.stdout.write(dim("  (y / n · c = cancel) → "));
      return;
    }
    if (line.trim() === ".cancel") {
      dialog = null;
      resolve({ cancelled: true });
      return;
    }
    dialog = null;
    resolve({ value: line });
  }
}
