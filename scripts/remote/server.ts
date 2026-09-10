/**
 * The remote daemon server: panel statics, the launchables JSON route, and
 * the authenticated WebSocket endpoint (`scripts/remote.ts` is the entry).
 *
 * Binds `127.0.0.1` only — the tailnet is the transport; `tailscale serve`
 * proxies at the MagicDNS name (HTTPS included) without this process doing
 * TLS. Auth is a bearer token from `<stateDir>/token` (auto-generated
 * `node:crypto` random on first start): WS clients send it in the `hello`
 * frame, HTTP clients via the `Authorization` header.
 *
 * WS frame contract (frame names are the contract):
 * - client to server: `hello {token, role?, run?}` (`role: "runner"` — a
 *   daemon-spawned child dialing home — opts out of panel broadcasts),
 *   `start {kind, ref, argv?}`, `stdin {runId, line}`, `kill {runId}`,
 *   `dialog {dialogId, blocking?, title?, message?, options?,
 *   placeholder?, prefill?}` (runner-only; the server relabels the id),
 *   `dialog-answer {dialogId, payload}` (panel answer or runner
 *   self-dismissal — first answer per dialog wins), `runs {}`, and the
 *   panel-only pi session frames: `pi-new {model?}`, `pi-list {}`,
 *   `pi-prompt {sessionId, message}` (awaited; failure → `error`),
 *   `pi-steer {sessionId, message}`, `pi-abort {sessionId}`,
 *   `pi-last-text {sessionId}`, `pi-dispose {sessionId}`
 * - server to client: `hello-ok`, `started {run}`, `output {runId,
 *   chunk}`, `exited {runId, code}`, `runs {runs}`, `dialog {dialogId,
 *   run?, blocking?, title?, message?, options?, placeholder?, prefill?}`
 *   (fan-out to panels), `dialog-answer {dialogId, payload}` (routed to
 *   the owning runner, runner-local id), `dialog-resolved {dialogId}`,
 *   `pi-sessions {sessions}`, `pi-event {sessionId, frame}` (raw pi
 *   event), `pi-settled {sessionId}`, `pi-last-text {sessionId, text}`
 *   (response to the request of the same name), `pi-exited {sessionId}`,
 *   `error {message}`
 */

import path from "node:path";
import { ensureDir, projectRoot } from "../utils/index.js";
import { DialogRegistry, parseDialogFrame, parseDialogPayload, type DialogFrame, type DialogPayload, type DialogSocketData } from "./dialogs.js";
import { assertStartAllowed, getLaunchables, resolveStartArgv } from "./launcher.js";
import { notify } from "./notify.js";
import { readOrCreateToken, servePanel } from "./http.js";
import { PiSessionManager } from "./pi-session.js";
import { RunSupervisor, type RunRecord } from "./runs.js";

/** Default daemon state directory (token, ntfy config, run logs). */
export const DEFAULT_STATE_DIR = path.join(projectRoot, ".remote");

/** Default port when `--port` is not passed. */
export const DEFAULT_PORT = 8799;

/** The topic authenticated sockets subscribe to for broadcast frames. */
const PANEL_TOPIC = "panel";

/** Per-socket state (set by the `hello` handshake). */
interface SocketData extends DialogSocketData {
  authenticated: boolean;
}

/** Constructor options for {@link startRemoteServer}. */
export interface RemoteServerOptions {
  /** TCP port (`0` for an ephemeral port, the probe pattern). */
  port?: number;
  /** State directory override (probe uses a temp dir). */
  stateDir?: string;
  /** Default `-m` model for new pi sessions (`--model` passthrough). */
  model?: string;
}

/** The running daemon handle. */
export interface RemoteServer {
  /** The bound TCP port. */
  readonly port: number;
  /** The bearer token WS `hello` frames and HTTP headers must carry. */
  readonly token: string;
  /**
   * Post a daemon-agnostic dialog and resolve with the first answer.
   */
  postDialog(dialog: DialogFrame): Promise<DialogPayload>;
  /**
   * Synthetic dialog test hook: a fixed dialog answered via the WS chain.
   */
  probeDialog(): Promise<DialogPayload>;
  /** Kill live children and stop listening; resolves once all are reaped. */
  stop(): Promise<void>;
}

/**
 * Start the remote daemon server.
 *
 * @param options Port and state-directory overrides.
 * @returns The running daemon handle.
 */
export async function startRemoteServer(options: RemoteServerOptions = {}): Promise<RemoteServer> {
  const port = options.port ?? DEFAULT_PORT;
  const stateDir = options.stateDir ?? DEFAULT_STATE_DIR;
  const logsDir = path.join(stateDir, "logs");
  await ensureDir(logsDir);
  const token = await readOrCreateToken(stateDir);

  /** Send one frame to every authenticated socket. */
  const publish = (frame: Record<string, unknown>): void => {
    server.publish(PANEL_TOPIC, JSON.stringify(frame));
  };

  /** Send one frame to a single socket. */
  const sendTo = (ws: Bun.ServerWebSocket<SocketData>, frame: Record<string, unknown>): void => {
    ws.send(JSON.stringify(frame));
  };

  const dialogs = new DialogRegistry({
    stateDir,
    publish: (frame: Record<string, unknown>): void => {
      publish(frame);
    },
  });

  const sessions = new PiSessionManager({
    publish: (frame: Record<string, unknown>): void => {
      publish(frame);
    },
    registerDialog: (dialog: DialogFrame, answer: (payload: DialogPayload) => void): void => {
      dialogs.register({ kind: "daemon", resolve: answer }, dialog);
    },
    defaultModel: options.model ?? null,
  });

  const supervisor = new RunSupervisor({
    logsDir,
    childEnv: (runId: string): Record<string, string> => ({
      HELLAJS_REMOTE: `ws://127.0.0.1:${server.port}`,
      HELLAJS_REMOTE_TOKEN: token,
      HELLAJS_REMOTE_RUN: runId,
    }),
    onOutput: (run: RunRecord, chunk: string): void => {
      publish({ type: "output", runId: run.id, chunk });
    },
    onExit: (run: RunRecord, code: number): void => {
      publish({ type: "exited", runId: run.id, code });
      void notify(`remote: run exited`, `${run.command} exited ${code}`, stateDir);
    },
  });

  /**
   * Handle one parsed client frame after authentication.
   */
  const handleFrame = (ws: Bun.ServerWebSocket<SocketData>, frame: Record<string, unknown>): void => {
    const type = frame["type"];
    if (type === "start") {
      void handleStart(ws, frame);
      return;
    }
    if (type === "stdin" || type === "kill") {
      const runId = frame["runId"];
      const line = frame["line"];
      if (typeof runId !== "string") {
        sendTo(ws, { type: "error", message: `${String(type)} requires a string "runId"` });
        return;
      }
      const applied = type === "stdin"
        ? typeof line === "string" && supervisor.writeStdin(runId, line)
        : supervisor.kill(runId);
      if (!applied) {
        sendTo(ws, { type: "error", message: `${String(type)}: no live run "${runId}"` });
      }
      return;
    }
    if (type === "runs") {
      sendTo(ws, { type: "runs", runs: supervisor.list() });
      return;
    }
    if (typeof type === "string" && type.startsWith("pi-")) {
      handlePiFrame(ws, frame, type);
      return;
    }
    if (type === "dialog-answer") {
      const dialogId = frame["dialogId"];
      const payload = parseDialogPayload(frame["payload"]);
      if (typeof dialogId !== "string" || payload === null) {
        sendTo(ws, { type: "error", message: "dialog-answer requires a string \"dialogId\" and an object \"payload\"" });
        return;
      }
      // A runner self-addressed id means it dismisses its own card
      // (another surface answered first) — targetFor maps it to the
      // server id; the first answer per dialog wins, later ones drop.
      if (!dialogs.answer(dialogs.targetFor(dialogId, ws), payload, ws)) {
        sendTo(ws, { type: "error", message: `dialog-answer: unknown or already-resolved dialog "${dialogId}"` });
      }
      return;
    }
    if (type === "dialog") {
      if (ws.data.role !== "runner") {
        sendTo(ws, { type: "error", message: "dialog frames are runner-only (panels answer via dialog-answer)" });
        return;
      }
      const runnerId = frame["dialogId"];
      if (typeof runnerId !== "string" || runnerId.length === 0) {
        sendTo(ws, { type: "error", message: "dialog requires a non-empty string \"dialogId\"" });
        return;
      }
      dialogs.register({ kind: "runner", ws, runnerId }, parseDialogFrame(frame));
      return;
    }
    sendTo(ws, { type: "error", message: `unknown frame type ${JSON.stringify(type)}` });
  };

  /**
   * Handle one `start` frame: resolve argv, guard concurrency, spawn.
   */
  const handleStart = async (ws: Bun.ServerWebSocket<SocketData>, frame: Record<string, unknown>): Promise<void> => {
    const kind = frame["kind"];
    const ref = frame["ref"];
    const rawArgv = frame["argv"];
    if (typeof kind !== "string" || typeof ref !== "string" || ref.length === 0) {
      sendTo(ws, { type: "error", message: "start requires string \"kind\" and non-empty string \"ref\"" });
      return;
    }
    const explicitArgv = kind === "custom" && Array.isArray(rawArgv)
      && rawArgv.length > 0 && rawArgv.every((part: unknown): boolean => typeof part === "string")
      ? rawArgv as string[]
      : null;
    try {
      const argv = resolveStartArgv(kind, ref, explicitArgv);
      assertStartAllowed(kind, ref, argv, supervisor.list());
      const run = await supervisor.start(argv, { kind, ref });
      publish({ type: "started", run });
    } catch (error) {
      sendTo(ws, { type: "error", message: (error as Error).message });
    }
  };

  /**
   * Handle one `pi-*` frame: pi sessions are daemon-owned children, so
   * only panel clients may drive them (runners dial home, they do not
   * chat).
   */
  const handlePiFrame = (ws: Bun.ServerWebSocket<SocketData>, frame: Record<string, unknown>, type: string): void => {
    if (ws.data.role !== "panel") {
      sendTo(ws, { type: "error", message: "pi frames are panel-only (pi children live in the daemon)" });
      return;
    }
    if (type === "pi-new") {
      const model = frame["model"];
      try {
        sessions.create(typeof model === "string" && model !== "" ? model : undefined);
        publish({ type: "pi-sessions", sessions: sessions.list() });
      } catch (error) {
        sendTo(ws, { type: "error", message: `pi-new: ${(error as Error).message}` });
      }
      return;
    }
    if (type === "pi-list") {
      sendTo(ws, { type: "pi-sessions", sessions: sessions.list() });
      return;
    }
    const sessionId = frame["sessionId"];
    if (typeof sessionId !== "string" || sessionId === "") {
      sendTo(ws, { type: "error", message: `${type} requires a non-empty string "sessionId"` });
      return;
    }
    if (type === "pi-dispose") {
      void sessions.dispose(sessionId).catch((error: Error): void => {
        sendTo(ws, { type: "error", message: error.message });
      });
      return;
    }
    if (type === "pi-last-text") {
      void sessions.lastText(sessionId).then(
        (text: string): void => {
          sendTo(ws, { type: "pi-last-text", sessionId, text });
        },
        (error: Error): void => {
          sendTo(ws, { type: "error", message: error.message });
        },
      );
      return;
    }
    if (type === "pi-abort") {
      void sessions.abort(sessionId).catch((error: Error): void => {
        sendTo(ws, { type: "error", message: error.message });
      });
      return;
    }
    const message = frame["message"];
    if (typeof message !== "string" || message === "") {
      sendTo(ws, { type: "error", message: `${type} requires a non-empty string "message"` });
      return;
    }
    if (type === "pi-prompt") {
      void sessions.prompt(sessionId, message).catch((error: Error): void => {
        sendTo(ws, { type: "error", message: error.message });
      });
      return;
    }
    if (type === "pi-steer") {
      void sessions.steer(sessionId, message).catch((error: Error): void => {
        sendTo(ws, { type: "error", message: error.message });
      });
      return;
    }
    sendTo(ws, { type: "error", message: `unknown frame type ${JSON.stringify(type)}` });
  };

  const server = Bun.serve<SocketData>({
    port,
    hostname: "127.0.0.1",
    websocket: {
      message(ws: Bun.ServerWebSocket<SocketData>, message: string | Buffer): void {
        let parsed: unknown;
        try {
          parsed = JSON.parse(String(message));
        } catch {
          sendTo(ws, { type: "error", message: "frames must be JSON" });
          return;
        }
        if (typeof parsed !== "object" || parsed === null) {
          sendTo(ws, { type: "error", message: "frames must be JSON objects" });
          return;
        }
        const frame = parsed as Record<string, unknown>;
        if (frame["type"] === "hello") {
          if (frame["token"] === token) {
            ws.data.authenticated = true;
            ws.data.role = frame["role"] === "runner" ? "runner" : "panel";
            const run = frame["run"];
            if (typeof run === "string" && run.length > 0) {
              ws.data.run = run;
            }
            if (ws.data.role === "panel") {
              ws.subscribe(PANEL_TOPIC);
            }
            sendTo(ws, { type: "hello-ok" });
          } else {
            sendTo(ws, { type: "error", message: "unauthorized: token rejected" });
            ws.close(4001, "unauthorized");
          }
          return;
        }
        if (!ws.data.authenticated) {
          sendTo(ws, { type: "error", message: "authenticate first: send { \"type\": \"hello\", \"token\": \"...\" }" });
          return;
        }
        handleFrame(ws, frame);
      },
      close(ws: Bun.ServerWebSocket<SocketData>): void {
        // A vanished runner leaves its cards unanswerable — dismiss them.
        dialogs.dismissOwned(ws);
      },
    },
    async fetch(request: Request, srv: Bun.Server<SocketData>): Promise<Response> {
      const { pathname } = new URL(request.url);
      if (pathname === "/ws") {
        if (!srv.upgrade(request, { data: { authenticated: false, role: "panel", runnerDialogs: new Map() } })) {
          return new Response("websocket upgrade required", { status: 400 });
        }
        return new Response(null);
      }
      if (pathname === "/api/launchables") {
        if (request.headers.get("authorization") !== `Bearer ${token}`) {
          return Response.json({ error: "unauthorized" }, { status: 401 });
        }
        return Response.json(getLaunchables());
      }
      return servePanel(pathname);
    },
  });

  const boundPort = server.port;
  if (boundPort === undefined) {
    server.stop(true);
    throw new Error("remote server bound no TCP port (unix socket?)");
  }

  return {
    port: boundPort,
    token,
    postDialog: (dialog: DialogFrame): Promise<DialogPayload> => dialogs.postDialog(dialog),
    probeDialog: (): Promise<DialogPayload> => dialogs.probeDialog(),
    async stop(): Promise<void> {
      await Promise.all([supervisor.dispose(), sessions.disposeAll()]);
      server.stop(true);
    },
  };
}
