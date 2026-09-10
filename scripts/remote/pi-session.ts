/**
 * Pi chat sessions for the remote daemon (`scripts/remote/server.ts`).
 *
 * One {@link PiSessionManager} owns every daemon-side `pi --mode rpc`
 * child (a {@link PiRpc} instance): the daemon, not the browser, owns the
 * process, so sessions survive phone disconnects. Handler adapters
 * translate RPC callbacks into WS frames: agent events forward verbatim
 * as `pi-event {sessionId, frame}` (the panel renders them with its own
 * one-liners, mirroring `scripts/agent/stream.ts` client-side), dialog
 * requests reuse the daemon-generic `dialog` frame (`blocking: true` —
 * panel card + ntfy gate push, first answer routed back as the pi
 * `extension_ui_response`), notifies publish non-blocking `dialog`
 * frames, and `waitForSettled` derives the `pi-settled {sessionId}`
 * frame that toggles the panel input state.
 */

import { logger } from "../utils/index.js";
import { PiRpc, type RpcFrame, type UiRequest } from "../agent/rpc.js";
import type { DialogFrame, DialogPayload } from "./dialogs.js";

/** One pi chat session as the registry and the panel see it. */
export interface PiSessionRecord {
  sessionId: string;
  sessionName: string;
  model: string | null;
}

/** Constructor wiring for {@link PiSessionManager}. */
export interface PiSessionManagerOptions {
  /** Broadcast sink for `pi-event` / `pi-settled` / `pi-exited` / notify frames. */
  publish: (frame: Record<string, unknown>) => void;
  /**
   * Register one blocking dialog (panel card + gate push) whose first
   * answer routes back to the asking pi child.
   */
  registerDialog: (dialog: DialogFrame, answer: (payload: DialogPayload) => void) => void;
  /** Daemon `--model` passthrough used when `pi-new` carries no model. */
  defaultModel: string | null;
}

/** One registry entry: the public record plus the owned RPC child. */
interface PiSessionEntry {
  record: PiSessionRecord;
  rpc: PiRpc;
}

/**
 * Spawns and supervises the daemon's pi chat sessions.
 *
 * Mirrors `RunSupervisor`'s registry shape: create registers, list
 * enumerates, dispose removes after the `PiRpc.dispose` reap (SIGTERM,
 * SIGKILL after 2s). No reaping loop is needed — each child is owned by
 * its `PiRpc` instance, which fails its pending waiters on exit.
 */
export class PiSessionManager {
  private readonly options: PiSessionManagerOptions;
  private readonly sessions = new Map<string, PiSessionEntry>();
  private nextId = 1;
  private nextNotify = 0;

  /**
   * @param options Broadcast sink, dialog registration, default model.
   */
  public constructor(options: PiSessionManagerOptions) {
    this.options = options;
  }

  /**
   * Spawn one pi session child and register it.
   *
   * @param model Optional `-m` model override (falls back to the daemon
   * default, then pi's own default).
   * @returns The registered session record.
   * @throws When the `pi` binary cannot be spawned (Bun.spawn propagates).
   */
  public create(model?: string): PiSessionRecord {
    const sessionId = `pi-${this.nextId}`;
    this.nextId += 1;
    const chosenModel = model ?? this.options.defaultModel;
    const record: PiSessionRecord = {
      sessionId,
      sessionName: `remote-${sessionId}`,
      model: chosenModel,
    };
    const manager = this;
    const rpc = new PiRpc({
      sessionName: record.sessionName,
      model: chosenModel ?? undefined,
      handlers: {
        onEvent: (event: RpcFrame): void => {
          manager.options.publish({ type: "pi-event", sessionId, frame: event });
        },
        onUiRequest: (request: UiRequest): void => {
          manager.registerApproval(rpc, request);
        },
        onUiNotify: (request: UiRequest): void => {
          // Fire-and-forget: no answer path, so no registry entry — the
          // panel renders it as a single-slot status card.
          manager.options.publish({
            type: "dialog",
            dialogId: manager.takeNotifyId(),
            title: request.title,
            message: request.message,
          });
        },
      },
    });
    this.sessions.set(sessionId, { record, rpc });
    return record;
  }

  /**
   * List the live sessions.
   *
   * @returns Session records in creation order.
   */
  public list(): PiSessionRecord[] {
    return [...this.sessions.values()].map((entry: PiSessionEntry): PiSessionRecord => entry.record);
  }

  /**
   * Send the next prompt and arm the settle frame.
   *
   * The prompt itself is awaited (the server surfaces a rejected response
   * as an `error` frame); once it lands, `waitForSettled` derives the
   * `pi-settled` broadcast that re-enables the panel input.
   *
   * @param sessionId Session id from the registry.
   * @param message Prompt text.
   */
  public async prompt(sessionId: string, message: string): Promise<void> {
    const entry = this.require(sessionId, "pi-prompt");
    await entry.rpc.prompt(message);
    void entry.rpc.waitForSettled().then(
      (): void => {
        this.options.publish({ type: "pi-settled", sessionId });
      },
      (): void => {
        // The child died mid-run: the run is over even without a settle
        // event, so re-enable the panel input and log the death.
        logger.warn(`pi session ${sessionId} ended before settling (child exit)`);
        this.options.publish({ type: "pi-settled", sessionId });
      },
    );
  }

  /**
   * Queue a steering message into the active run.
   *
   * @param sessionId Session id from the registry.
   * @param message Steering text.
   */
  public async steer(sessionId: string, message: string): Promise<void> {
    await this.require(sessionId, "pi-steer").rpc.steer(message);
  }

  /**
   * Abort the session's active run.
   *
   * @param sessionId Session id from the registry.
   */
  public async abort(sessionId: string): Promise<void> {
    await this.require(sessionId, "pi-abort").rpc.abort();
  }

  /**
   * Fetch the session's last assistant text (the `pi-last-text` pair).
   *
   * @param sessionId Session id from the registry.
   * @returns The text content, or "" when none.
   */
  public async lastText(sessionId: string): Promise<string> {
    return await this.require(sessionId, "pi-last-text").rpc.getLastAssistantText();
  }

  /**
   * Terminate one session and broadcast its exit.
   *
   * Resolves once the child is reaped (`PiRpc.dispose`: SIGTERM, then
   * SIGKILL after 2s), then removes the registry entry, publishes
   * `pi-exited`, and refreshes the panel's session list.
   *
   * @param sessionId Session id from the registry.
   */
  public async dispose(sessionId: string): Promise<void> {
    const entry = this.require(sessionId, "pi-dispose");
    await entry.rpc.dispose();
    this.sessions.delete(sessionId);
    this.options.publish({ type: "pi-exited", sessionId });
    this.options.publish({ type: "pi-sessions", sessions: this.list() });
  }

  /**
   * Terminate every live session (daemon shutdown); resolves once all
   * children are reaped.
   */
  public async disposeAll(): Promise<void> {
    const ids = [...this.sessions.keys()];
    await Promise.all(ids.map((sessionId: string): Promise<void> => this.dispose(sessionId)));
  }

  /**
   * Fetch a registry entry or name the frame that asked for it.
   *
   * @param sessionId Session id from the registry.
   * @param frame The requesting frame name (error context).
   * @returns The registry entry.
   */
  private require(sessionId: string, frame: string): PiSessionEntry {
    const entry = this.sessions.get(sessionId);
    if (entry === undefined) {
      throw new Error(`${frame}: no pi session "${sessionId}"`);
    }
    return entry;
  }

  /**
   * Mint the next synthetic notify-dialog id.
   *
   * @returns A fresh panel-dismissable id (notify cards never resolve).
   */
  private takeNotifyId(): string {
    this.nextNotify += 1;
    return `pi-notify-${this.nextNotify}`;
  }

  /**
   * Register one pi dialog request as a blocking panel card whose first
   * answer becomes the pi `extension_ui_response`.
   *
   * @param rpc The owning session child.
   * @param request The dialog request (select / input / confirm / editor).
   */
  private registerApproval(rpc: PiRpc, request: UiRequest): void {
    this.options.registerDialog(
      {
        blocking: true,
        title: request.title,
        message: request.message,
        options: request.options,
        placeholder: request.placeholder,
        prefill: request.prefill,
      },
      (payload: DialogPayload): void => {
        rpc.respondUi(request.id, payload);
      },
    );
  }
}
