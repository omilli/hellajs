import { logger } from "../utils/index.js";
import { TerminalRelay, type Relay } from "./relay.js";
import { WebRelay } from "./web-relay.js";
import { PiRpc, type UiRequest, type UiResponsePayload } from "./rpc.js";
import { streamEvent } from "./stream.js";

/** Options for driving one fresh pi instance. */
export interface DriveOptions {
  sessionName: string;
  prompt: string;
  model?: string;
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
 * Wire the shared relay: the terminal relay always; when `HELLAJS_REMOTE`
 * names a daemon WS URL, a first-answer-wins fan-out adds the web surface
 * (both render, either answers, the loser's answer is discarded).
 *
 * @returns The wired relay (call `start()` on it once per process).
 */
export function makeRelay(): Relay {
  const terminal = new TerminalRelay({
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
  const url = process.env["HELLAJS_REMOTE"];
  if (typeof url !== "string" || url.length === 0) {
    return terminal;
  }
  const token = process.env["HELLAJS_REMOTE_TOKEN"] ?? "";
  const run = process.env["HELLAJS_REMOTE_RUN"];
  return new FanOutRelay(terminal, new WebRelay({
    url,
    token,
    run: typeof run === "string" && run.length > 0 ? run : undefined,
  }));
}

/**
 * First-answer-wins fan-out: renders every request on both surfaces and
 * resolves with whichever answer lands first (a native promise ignores the
 * later resolve for free; the explicit work is dismissing the losing web
 * card via `dialog-resolved` when the terminal wins).
 */
class FanOutRelay implements Relay {
  private readonly terminal: Relay;
  private readonly web: WebRelay;

  /**
   * @param terminal The stdin-owning terminal relay.
   * @param web The daemon-dialed web relay.
   */
  public constructor(terminal: Relay, web: WebRelay) {
    this.terminal = terminal;
    this.web = web;
  }

  /** Start the surfaces (the terminal one owns stdin; the web one no-ops). */
  public start(): void {
    this.terminal.start();
    this.web.start();
  }

  /** Render a fire-and-forget request on both surfaces. */
  public notify(request: UiRequest): void {
    this.terminal.notify(request);
    this.web.notify(request);
  }

  /**
   * Render a dialog on both surfaces; the first answer resolves the ask.
   *
   * @param request A dialog-type `extension_ui_request`.
   * @returns The winning surface's response payload.
   */
  public ask(request: UiRequest): Promise<UiResponsePayload> {
    return this.firstAnswer(
      (): Promise<UiResponsePayload> => this.terminal.ask(request),
      (): Promise<UiResponsePayload> => this.web.ask(request),
    );
  }

  /**
   * Ask an orchestrator-owned question on both surfaces; the first answer
   * resolves it.
   *
   * @param prompt Question text rendered on both surfaces.
   * @returns The winning surface's answer line.
   */
  public askOrchestrator(prompt: string): Promise<string> {
    return this.firstAnswer(
      (): Promise<string> => this.terminal.askOrchestrator(prompt),
      (): Promise<string> => this.web.askOrchestrator(prompt),
    );
  }

  /**
   * Race both surfaces' asks: the first resolution wins, later ones are
   * discarded, and a terminal win dismisses the pending web card.
   *
   * @param askTerminal Produces the terminal surface's promise.
   * @param askWeb Produces the web surface's promise.
   * @returns The first answer's value.
   */
  private firstAnswer<T>(askTerminal: () => Promise<T>, askWeb: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve: (value: T) => void): void => {
      let settled = false;
      const settle = (value: T, fromTerminal: boolean): void => {
        if (settled) {
          return;
        }
        settled = true;
        if (fromTerminal) {
          this.web.dismissPending();
        }
        resolve(value);
      };
      void askTerminal().then((value: T): void => {
        settle(value, true);
      });
      void askWeb().then((value: T): void => {
        settle(value, false);
      });
    });
  }
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
