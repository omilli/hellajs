/**
 * Web relay over the remote daemon (`scripts/agent/driver.ts` composes it
 * into the first-answer-wins fan-out).
 *
 * `WebRelay` dials the daemon WS URL (`HELLAJS_REMOTE`) with the panel
 * token (`HELLAJS_REMOTE_TOKEN`) and renders dialogs as structured
 * `dialog` frames the panel shows as cards; answers arrive as
 * `dialog-answer` frames routed back by the daemon. The frame shapes are
 * the convention shared with `scripts/remote/` — this module stays free of
 * `scripts/remote/` imports, mirroring how `agent/rpc.ts` owns its wire
 * types. Degradation is a no-op: a failed connection logs once and the
 * relay stays silent, so a run never blocks on the daemon (the terminal
 * surface still answers; the fan-out race resolves through it).
 */

import { logger } from "../utils/index.js";
import type { Relay } from "./relay.js";
import type { UiRequest, UiResponsePayload } from "./rpc.js";

/** Constructor wiring for {@link WebRelay} (read from the daemon env pair). */
export interface WebRelayOptions {
  /** Daemon WS URL (`HELLAJS_REMOTE`); `/ws` appended when pathless. */
  url: string;
  /** Panel token (`HELLAJS_REMOTE_TOKEN`). */
  token: string;
  /** Daemon run id (`HELLAJS_REMOTE_RUN`) labeling dialogs on the panel. */
  run?: string;
}

/** One ask awaiting its routed `dialog-answer`. */
interface PendingAnswer {
  resolve: (response: UiResponsePayload) => void;
  /** Translates the panel payload for the request method (confirm → y/n). */
  translate: (payload: UiResponsePayload) => UiResponsePayload;
}

/**
 * Narrow an unknown `dialog-answer` payload to its typed shape.
 * (Unknown fields are dropped, not rejected — the payload is advisory.)
 *
 * @param value The raw `dialog-answer` payload.
 * @returns The typed payload, or null when not an object.
 */
function parsePayload(value: unknown): UiResponsePayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const payload: UiResponsePayload = {};
  if (typeof record["value"] === "string") {
    payload.value = record["value"];
  }
  if (typeof record["confirmed"] === "boolean") {
    payload.confirmed = record["confirmed"];
  }
  if (typeof record["cancelled"] === "boolean") {
    payload.cancelled = record["cancelled"];
  }
  return payload;
}

/** The identity payload translation (select / input / editor cards). */
function keepPayload(payload: UiResponsePayload): UiResponsePayload {
  return payload;
}

/**
 * Web relay: renders dialogs on the remote panel through the daemon.
 *
 * `notify` is fire-and-forget (a status card, no answer path, no push);
 * `ask`/`askOrchestrator` post blocking frames (the panel shows buttons or
 * a free-text card) and resolve on the routed answer. Frames posted before
 * the dial completes buffer and flush once authenticated. `start()` is a
 * no-op — the terminal relay stays the single stdin owner.
 */
export class WebRelay implements Relay {
  private readonly options: WebRelayOptions;
  private socket: WebSocket | null = null;
  private failed = false;
  private nextDialogId = 0;
  private readonly outbox: string[] = [];
  private readonly pending = new Map<string, PendingAnswer>();

  /**
   * @param options Daemon URL, token, and optional run label.
   */
  public constructor(options: WebRelayOptions) {
    this.options = options;
    this.connect();
  }

  /** No-op: the web surface owns no stdin (the terminal relay does). */
  public start(): void {}

  /** Post a fire-and-forget notify frame (status card, no answer path). */
  public notify(request: UiRequest): void {
    this.post({
      type: "dialog",
      dialogId: this.localId(),
      title: request.title ?? request.notifyType,
      message: request.message,
      placeholder: request.placeholder,
    });
  }

  /**
   * Post a blocking dialog frame and resolve with the panel's answer.
   *
   * Confirm requests post `y` / `n` options and translate the tapped value
   * back into `confirmed` — the payload contract the extension expects
   * (the same shapes the terminal relay replies with).
   *
   * @param request A dialog-type `extension_ui_request`.
   * @returns The response payload to send back.
   */
  public ask(request: UiRequest): Promise<UiResponsePayload> {
    const dialogId = this.localId();
    const frame: Record<string, unknown> = {
      type: "dialog",
      dialogId,
      blocking: true,
      title: request.title,
      message: request.message,
      placeholder: request.placeholder,
      prefill: request.prefill,
    };
    if (request.method === "select") {
      frame["options"] = request.options ?? [];
    }
    if (request.method === "confirm") {
      frame["options"] = ["y", "n"];
    }
    const translate = request.method === "confirm"
      ? (payload: UiResponsePayload): UiResponsePayload => ({ confirmed: payload.value !== "n" })
      : keepPayload;
    return new Promise<UiResponsePayload>((resolve: (response: UiResponsePayload) => void): void => {
      this.pending.set(dialogId, { resolve, translate });
      this.post(frame);
    });
  }

  /**
   * Post a blocking free-text gate card (title = prompt, no options).
   *
   * @param prompt Question text shown as the card title.
   * @returns The answered line (empty when unanswered).
   */
  public askOrchestrator(prompt: string): Promise<string> {
    const dialogId = this.localId();
    return new Promise<string>((resolve: (line: string) => void): void => {
      this.pending.set(dialogId, {
        resolve: (payload: UiResponsePayload): void => {
          resolve(payload.value ?? "");
        },
        translate: keepPayload,
      });
      this.post({ type: "dialog", dialogId, blocking: true, title: prompt });
    });
  }

  /**
   * Dismiss the pending web card after another surface answered first.
   *
   * Sends a self-addressed `dialog-answer` so the daemon broadcasts
   * `dialog-resolved` and the panel dismisses the card. The dialog side
   * serializes asks, so one pending answer is the steady state.
   */
  public dismissPending(): void {
    const [first] = this.pending;
    if (first === undefined) {
      return;
    }
    const [dialogId] = first;
    this.pending.delete(dialogId);
    this.post({ type: "dialog-answer", dialogId, payload: {} });
  }

  /** Allocate one runner-local dialog id. */
  private localId(): string {
    this.nextDialogId += 1;
    return `web-${this.nextDialogId}`;
  }

  /** Dial the daemon once; buffer frames until the handshake completes. */
  private connect(): void {
    let target: URL;
    try {
      target = new URL(this.options.url);
      if (target.pathname === "/" || target.pathname === "") {
        target.pathname = "/ws";
      }
    } catch {
      this.fail(`invalid HELLAJS_REMOTE URL: ${this.options.url}`);
      return;
    }
    let socket: WebSocket;
    try {
      socket = new WebSocket(target.href);
    } catch {
      this.fail(`could not dial ${target.href}`);
      return;
    }
    socket.addEventListener("open", (): void => {
      this.socket = socket;
      this.post({ type: "hello", token: this.options.token, role: "runner", run: this.options.run });
      for (const text of this.outbox.splice(0)) {
        socket.send(text);
      }
    });
    socket.addEventListener("message", (event: MessageEvent): void => {
      this.handleFrame(event.data);
    });
    socket.addEventListener("close", (): void => {
      if (this.socket === socket) {
        this.socket = null;
      }
      this.fail(`daemon connection closed (${target.href})`);
    });
  }

  /** Send one frame when connected; buffer while dialing; drop when failed. */
  private post(frame: Record<string, unknown>): void {
    const text = JSON.stringify(frame);
    if (this.socket !== null && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(text);
      return;
    }
    if (!this.failed) {
      this.outbox.push(text);
    }
  }

  /** Route one server frame: answers resolve the matching pending ask. */
  private handleFrame(data: unknown): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(data));
    } catch {
      return;
    }
    if (typeof parsed !== "object" || parsed === null) {
      return;
    }
    const frame = parsed as Record<string, unknown>;
    if (frame["type"] !== "dialog-answer") {
      return;
    }
    const dialogId = frame["dialogId"];
    const payload = parsePayload(frame["payload"]);
    if (typeof dialogId !== "string" || payload === null) {
      return;
    }
    const answer = this.pending.get(dialogId);
    if (answer === undefined) {
      return;
    }
    this.pending.delete(dialogId);
    answer.resolve(answer.translate(payload));
  }

  /** Log the degradation once, then stay silent for the process lifetime. */
  private fail(reason: string): void {
    if (this.failed) {
      return;
    }
    this.failed = true;
    logger.warn(`web relay disabled: ${reason} — the terminal stays the answering surface`);
  }
}
