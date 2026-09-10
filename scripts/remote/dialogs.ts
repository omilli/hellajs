/**
 * Dialog registry + first-answer-wins arbitration for the remote daemon
 * (`scripts/remote/server.ts`). Owns the dialog wire types and the
 * per-dialog lifecycle: registration + panel fan-out, the first
 * `dialog-answer` per dialog winning (a panel tap routes to the owning
 * runner; a runner's self-addressed id dismisses its card after another
 * surface answered — later answers drop), the `dialog-resolved`
 * broadcast, orphan dismissal on runner-socket close, and the ntfy gate
 * push for blocking fan-outs.
 */

import { notifyGate } from "./notify.js";

/** Answer payload for a dialog: exactly one field is set. */
export interface DialogPayload {
  value?: string;
  confirmed?: boolean;
  cancelled?: boolean;
}

/** The daemon-agnostic dialog frame fields any source may post. */
export interface DialogFrame {
  title?: string;
  message?: string;
  options?: string[];
  placeholder?: string;
  prefill?: string;
  /** True for answer-blocking asks (gates + dialogs) — fires the gate push. */
  blocking?: boolean;
}

/** The socket-state slices the registry reads (server.ts extends this). */
export interface DialogSocketData {
  /** Panel sockets receive broadcasts; runner sockets only routed answers. */
  role: "panel" | "runner";
  /** Daemon run id a runner labels its dialogs with (from the dial-home env). */
  run?: string;
  /** Runner-local dialog id → server dialog id (this socket's own dialogs). */
  readonly runnerDialogs: Map<string, string>;
}

/** One registered dialog: daemon-resolved or owned by a runner socket. */
export type DialogEntry =
  | { kind: "daemon"; resolve: (payload: DialogPayload) => void }
  | { kind: "runner"; ws: Bun.ServerWebSocket<DialogSocketData>; runnerId: string };

/** Constructor wiring for {@link DialogRegistry}. */
export interface DialogRegistryOptions {
  /** Daemon state directory (gate-push config). */
  stateDir: string;
  /** Broadcast sink for `dialog` / `dialog-resolved` fan-out to panels. */
  publish: (frame: Record<string, unknown>) => void;
}

/**
 * Narrow an unknown dialog-answer payload to its typed shape.
 * (Unknown fields are dropped, not rejected — the payload is advisory.)
 *
 * @param value The raw `dialog-answer` payload.
 * @returns The typed payload, or null when not an object.
 */
export function parseDialogPayload(value: unknown): DialogPayload | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const payload: DialogPayload = {};
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

/**
 * Narrow an unknown dialog frame to its typed shape.
 * (Unknown fields are dropped, not rejected — the frame is advisory.)
 *
 * @param frame The raw `dialog` frame from a runner.
 * @returns The typed dialog fields.
 */
export function parseDialogFrame(frame: Record<string, unknown>): DialogFrame {
  const dialog: DialogFrame = {};
  if (typeof frame["title"] === "string") {
    dialog.title = frame["title"];
  }
  if (typeof frame["message"] === "string") {
    dialog.message = frame["message"];
  }
  if (typeof frame["placeholder"] === "string") {
    dialog.placeholder = frame["placeholder"];
  }
  if (typeof frame["prefill"] === "string") {
    dialog.prefill = frame["prefill"];
  }
  if (Array.isArray(frame["options"]) && frame["options"].every((option: unknown): boolean => typeof option === "string")) {
    dialog.options = frame["options"] as string[];
  }
  if (frame["blocking"] === true) {
    dialog.blocking = true;
  }
  return dialog;
}

/**
 * The per-dialog registry: registration, first-answer-wins resolution,
 * and dismissal bookkeeping for every dialog source (daemon-side hooks
 * and runner-posted cards).
 */
export class DialogRegistry {
  private readonly options: DialogRegistryOptions;
  private readonly dialogs = new Map<string, DialogEntry>();
  private counter = 0;

  /**
   * @param options State directory plus the panel broadcast sink.
   */
  public constructor(options: DialogRegistryOptions) {
    this.options = options;
  }

  /**
   * Register one dialog, fan it out to the panels, and push ntfy when it
   * blocks (fixed "gate waiting" template + title only).
   *
   * @param entry The dialog owner (daemon resolve or runner socket).
   * @param dialog The typed dialog fields.
   * @returns The server-side dialog id.
   */
  public register(entry: DialogEntry, dialog: DialogFrame): string {
    this.counter += 1;
    const dialogId = `dialog-${this.counter}`;
    this.dialogs.set(dialogId, entry);
    const frame: Record<string, unknown> = { type: "dialog", dialogId, ...dialog };
    if (entry.kind === "runner") {
      entry.ws.data.runnerDialogs.set(entry.runnerId, dialogId);
      if (entry.ws.data.run !== undefined) {
        frame["run"] = entry.ws.data.run;
      }
    }
    this.options.publish(frame);
    if (dialog.blocking === true) {
      void notifyGate(dialog.title, this.options.stateDir);
    }
    return dialogId;
  }

  /**
   * Resolve the answer target: a runner's self-addressed (runner-local)
   * id maps to its server id — it dismisses its own card; anything else
   * addresses the server id space directly.
   *
   * @param dialogId The id carried by the `dialog-answer` frame.
   * @param answerer The socket that sent the answer.
   * @returns The server id to resolve.
   */
  public targetFor(dialogId: string, answerer: Bun.ServerWebSocket<DialogSocketData>): string {
    if (answerer.data.role === "runner") {
      return answerer.data.runnerDialogs.get(dialogId) ?? dialogId;
    }
    return dialogId;
  }

  /**
   * Resolve one dialog (first answer wins): broadcast the dismissal, then
   * deliver the answer to the daemon asker or the owning runner.
   *
   * @param target The server dialog id (from {@link targetFor}).
   * @param payload The winning answer payload.
   * @param answerer The socket that sent the answer.
   * @returns True when the dialog was registered and is now resolved.
   */
  public answer(target: string, payload: DialogPayload, answerer: Bun.ServerWebSocket<DialogSocketData>): boolean {
    const entry = this.dialogs.get(target);
    if (entry === undefined) {
      return false;
    }
    this.dialogs.delete(target);
    if (entry.kind === "runner") {
      entry.ws.data.runnerDialogs.delete(entry.runnerId);
    }
    this.options.publish({ type: "dialog-resolved", dialogId: target });
    if (entry.kind === "daemon") {
      entry.resolve(payload);
      return true;
    }
    if (entry.ws !== answerer) {
      entry.ws.send(JSON.stringify({ type: "dialog-answer", dialogId: entry.runnerId, payload }));
    }
    return true;
  }

  /**
   * Dismiss every dialog owned by a closing runner socket (its cards
   * would otherwise stay unanswerable on the panels).
   *
   * @param ws The runner socket that closed.
   */
  public dismissOwned(ws: Bun.ServerWebSocket<DialogSocketData>): void {
    for (const dialogId of ws.data.runnerDialogs.values()) {
      if (this.dialogs.has(dialogId)) {
        this.answer(dialogId, {}, ws);
      }
    }
  }

  /**
   * Post a daemon-side dialog and resolve with the first answer.
   *
   * @param dialog The typed dialog fields.
   * @returns The winning answer payload.
   */
  public postDialog(dialog: DialogFrame): Promise<DialogPayload> {
    return new Promise<DialogPayload>((resolve: (payload: DialogPayload) => void): void => {
      this.register({ kind: "daemon", resolve }, dialog);
    });
  }

  /**
   * Synthetic dialog test hook: a fixed dialog answered via the WS chain.
   *
   * @returns The winning answer payload.
   */
  public probeDialog(): Promise<DialogPayload> {
    return this.postDialog({
      title: "Probe dialog",
      message: "Synthetic daemon-side dialog (probe hook)",
      options: ["probe-yes", "probe-no"],
    });
  }
}
