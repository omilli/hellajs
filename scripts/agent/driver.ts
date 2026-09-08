import { logger } from "../utils/index.js";
import { TerminalRelay } from "./relay.js";
import { PiRpc, type UiRequest, type UiResponsePayload } from "./rpc.js";
import { streamEvent } from "./stream.js";

/** Options for driving one fresh pi instance. */
export interface DriveOptions {
  sessionName: string;
  prompt: string;
  model?: string;
  relay: TerminalRelay;
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
 * Build the dialog hook that answers via the live instance's respondUi.
 *
 * @param relay The terminal relay rendering the dialog.
 * @param onAsk Optional side effect fired when a dialog arrives.
 * @returns The hook to pass as {@link DriveOptions.onUiRequest}.
 */
export function dialogHook(relay: TerminalRelay, onAsk?: () => void): DialogHook {
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
 * Spawn one fresh pi instance, deliver the prompt, relay its dialogs, and
 * return its final assistant text.
 *
 * @param options Session name, prompt, model, relay, and dialog hook.
 * @returns The last assistant message text.
 */
export async function driveAgent(options: DriveOptions): Promise<string> {
  const rpc = new PiRpc({
    sessionName: options.sessionName,
    model: options.model,
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
 * Wire the shared terminal relay to the current instance: free-typed lines
 * steer it while active, `.stop` aborts it.
 *
 * @returns The wired relay (call `start()` on it once per process).
 */
export function makeRelay(): TerminalRelay {
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
