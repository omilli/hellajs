import { logger } from "../utils/index.ts";
import { TerminalRelay, type Relay } from "./relay.ts";
import { PiRpc, type UiRequest, type UiResponsePayload } from "./rpc.ts";
import { streamEvent } from "./stream.ts";

/** Options for driving one fresh pi instance. */
export interface DriveOptions {
  sessionName: string;
  prompt: string;
  model?: string;
  thinking?: string;
  relay: Relay;
  onUiRequest: (request: UiRequest) => void;
}

/** Dialog hook: answers relay dialogs through the live instance. */
export type DialogHook = (request: UiRequest) => void;

/** The instance currently driven (steer/abort target, SIGINT victim). */
let current: PiRpc | null = null;

/** True while a driven instance is running (steering is allowed). */
export function isAgentActive(): boolean {
  return current !== null;
}

/**
 * Pick the unattended answer for one dialog.
 *
 * Selects take the option carrying the "(Recommended)" marker (the
 * `ask_user_question` convention), falling back to the first option;
 * confirms proceed; free-text dialogs (`input`, `editor`) cannot be
 * synthesized and cancel.
 *
 * @param request A dialog-type `extension_ui_request`.
 * @returns The payload to answer with.
 */
function autoAnswer(request: UiRequest): UiResponsePayload {
  if (request.method === "select") {
    const options = request.options ?? [];
    const value =
      options.find((option: string): boolean => option.includes("(Recommended)")) ?? options[0];
    return value === undefined ? { cancelled: true } : { value };
  }
  if (request.method === "confirm") {
    return { confirmed: true };
  }
  return { cancelled: true };
}

/** One-line rendering of an auto-answer for the operator log. */
function describeAnswer(payload: UiResponsePayload): string {
  if (payload.value !== undefined) {
    return `"${payload.value}"`;
  }
  return payload.confirmed === true ? "confirmed" : "cancelled";
}

/**
 * Build the dialog hook that answers via the live instance's respondUi.
 *
 * @param relay The relay rendering the dialog on its surface(s).
 * @param onAsk Optional side effect fired when a dialog arrives.
 * @returns The hook to pass as {@link DriveOptions.onUiRequest}.
 */
export function dialogHook(relay: Relay, onAsk?: () => void): DialogHook {
  return (request: UiRequest): void => {
    if (onAsk !== undefined) {
      onAsk();
    }
    void relay.ask(request).then((response: UiResponsePayload): void => {
      current?.respondUi(request.id, response);
    });
  };
}

/**
 * Build the quiet-mode dialog hook: answer dialogs without an operator.
 *
 * Every dialog is auto-answered per {@link autoAnswer} and logged, so an
 * unattended run still shows what was chosen when it fires a dialog despite
 * the quiet prompt.
 *
 * @param onAsk Optional side effect fired when a dialog arrives.
 * @returns The hook to pass as {@link DriveOptions.onUiRequest}.
 */
export function autoDialogHook(onAsk?: () => void): DialogHook {
  return (request: UiRequest): void => {
    if (onAsk !== undefined) {
      onAsk();
    }
    const payload = autoAnswer(request);
    logger.info(
      `quiet: auto-answer ${request.method} "${request.title ?? ""}" → ${describeAnswer(payload)}`,
    );
    current?.respondUi(request.id, payload);
  };
}

/**
 * Spawn one fresh pi instance, deliver the prompt, relay its dialogs, and
 * return its final assistant text.
 *
 * @param options Session name, prompt, model, thinking level, relay, and dialog hook.
 * @returns The last assistant message text.
 */
export async function driveAgent(options: DriveOptions): Promise<string> {
  const rpc = new PiRpc({
    sessionName: options.sessionName,
    model: options.model,
    thinking: options.thinking,
    handlers: {
      onEvent: (event): void => {
        streamEvent(event);
      },
      onUiRequest: options.onUiRequest,
      onUiNotify: (request: UiRequest): void => {
        options.relay.notify(request);
      },
    },
  });
  current = rpc;
  try {
    await rpc.prompt(options.prompt);
    await rpc.waitForSettled();
    return await rpc.getLastAssistantText();
  } finally {
    current = null;
    await rpc.dispose();
  }
}

/**
 * Wire the shared terminal relay: renders dialogs and orchestrator gates
 * on stdin (a line answers the pending ask).
 *
 * @returns The wired relay (call `start()` on it once per process).
 */
export function makeRelay(): Relay {
  return new TerminalRelay({
    isActive: isAgentActive,
    onSteer: (message: string): void => {
      current?.steer(message).catch((error: unknown): void => {
        logger.warn(`steer failed: ${(error as Error).message}`);
      });
    },
    onAbort: (): void => {
      current?.abort().catch((): void => {});
    },
  });
}

/** Guards the one-time SIGINT registration (a second listener would double-exit). */
let sigintInstalled = false;

/**
 * SIGINT: abort and reap the current child, then exit 1 without starting
 * the next unit.
 */
export function installSigint(): void {
  if (sigintInstalled) {
    return;
  }
  sigintInstalled = true;
  process.on("SIGINT", (): void => {
    const rpc = current;
    logger.warn("SIGINT — aborting the current instance…");
    const hardExit = setTimeout((): void => {
      process.exit(1);
    }, 3000);
    if (rpc === null) {
      process.exit(1);
    }
    void rpc
      .dispose()
      .catch((): void => {})
      .finally((): void => {
        clearTimeout(hardExit);
        process.exit(1);
      });
  });
}
