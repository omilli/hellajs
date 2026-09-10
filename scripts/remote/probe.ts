/**
 * The `bun remote --probe` self-test (`scripts/remote.ts` passes `--model`
 * through for the future pi chat sessions; this probe does not use it).
 *
 * Boots the real server on an ephemeral port with a temp token and temp
 * state dir, then asserts the full chain over a real WS client:
 * unauthenticated `hello` rejected, authenticated start/output/stdin/exited
 * roundtrip on a `bun -e` child, the synthetic dialog roundtrip, kill of a
 * never-exiting child, the runner-mode gates (a daemon-spawned child poses
 * `makeRelay()` dialogs — select + orchestrator gate — answered over WS,
 * with first-answer-wins arbitration), the `GET /api/launchables` listing,
 * the ntfy run-exit POST landing on a local HTTP receiver standing in
 * as `ntfyBase`, and a scripted pi chat session (create → prompt →
 * settled → non-empty last text → dispose → exited) over a real `pi`
 * child. The pi leg skips with a warning when `pi` is not on PATH.
 * Throws on the first failed expectation (the entry exits 1).
 */

import { rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ensureDir, logger, projectRoot, writeJson } from "../utils/index.js";
import { PRESETS } from "./launcher.js";
import { startRemoteServer, type RemoteServer } from "./server.js";

/** Options the entry passes through to the probe. */
export interface ProbeOptions {
  /** `--model` passthrough (pi chat sessions, not this probe). */
  model: string | null;
}

/** One parsed WS frame from the server under test. */
type Frame = Record<string, unknown>;

/** One POST recorded by the local ntfy receiver. */
interface ReceiverPost {
  path: string;
  body: string;
  title: string | null;
}

/**
 * The runner-mode fixture (written at runtime into the probe state dir):
 * drives `makeRelay()` under the daemon-injected env — one web-answered
 * select, one web-answered orchestrator gate, one terminal-answered
 * select. The 1s pause after the first resolution holds the stale terminal
 * dialog open so the probe's late stdin line is provably discarded. Imports
 * resolve relative to the state dir (`.remote-probe/` under the root).
 */
const RUNNER_FIXTURE = [
  "/**",
  " * Remote probe runner fixture (runtime-written by scripts/remote/probe.ts).",
  " */",
  "const { makeRelay } = await import(\"../scripts/agent/driver.js\");",
  "",
  "const relay = makeRelay();",
  "relay.start();",
  "",
  "const pick = await relay.ask({",
  "  id: \"probe-web-ask\",",
  "  method: \"select\",",
  "  title: \"Probe runner select\",",
  "  options: [\"retry\", \"skip\"],",
  "});",
  "console.log(\"RUNNER-ASK:\" + JSON.stringify(pick));",
  "await new Promise((resolve) => setTimeout(resolve, 1000));",
  "",
  "const gate = await relay.askOrchestrator(\"retry / skip / halt?\");",
  "console.log(\"RUNNER-GATE:\" + gate);",
  "",
  "const web = await relay.ask({",
  "  id: \"probe-terminal-ask\",",
  "  method: \"select\",",
  "  title: \"Probe terminal wins\",",
  "  options: [\"first\", \"second\"],",
  "});",
  "console.log(\"RUNNER-WEBWIN:\" + JSON.stringify(web));",
  "console.log(\"RUNNER-DONE\");",
  "process.exit(0);",
].join("\n");

/** Fail an expectation (the entry reports and exits 1). */
function expect(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`probe failed: ${message}`);
  }
}

/** Resolve after a delay. */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve: () => void): void => {
    setTimeout(resolve, ms);
  });
}

/**
 * Open one WS connection to the server under test.
 *
 * @param url The `ws://` endpoint URL.
 * @returns The open socket.
 */
function connect(url: string): Promise<WebSocket> {
  return new Promise((resolve: (socket: WebSocket) => void, reject: (error: Error) => void): void => {
    const socket = new WebSocket(url);
    socket.addEventListener("open", (): void => resolve(socket));
    socket.addEventListener("error", (): void => reject(new Error(`could not open ${url}`)));
  });
}

/**
 * Predicate-matched frame reader over one WS connection: frames buffer
 * until a waiter's predicate matches, so out-of-order frames never
 * misroute a waiter.
 */
class FrameStream {
  private readonly frames: Frame[] = [];
  private readonly waiters: { predicate: (frame: Frame) => boolean; resolve: (frame: Frame) => void }[] = [];

  /**
   * Feed one parsed frame to the stream.
   *
   * @param frame The parsed server frame.
   */
  public push(frame: Frame): void {
    const index = this.waiters.findIndex((waiter): boolean => waiter.predicate(frame));
    if (index !== -1) {
      const [waiter] = this.waiters.splice(index, 1);
      if (waiter !== undefined) {
        waiter.resolve(frame);
        return;
      }
    }
    this.frames.push(frame);
  }

  /**
   * Await the next frame matching the predicate.
   *
   * @param predicate Frame matcher.
   * @param label Expectation name for the timeout message.
   * @param timeoutMs How long to wait before failing.
   * @returns The matched frame.
   */
  public next(predicate: (frame: Frame) => boolean, label: string, timeoutMs = 15000): Promise<Frame> {
    const buffered = this.frames.findIndex(predicate);
    if (buffered !== -1) {
      const [frame] = this.frames.splice(buffered, 1);
      if (frame !== undefined) {
        return Promise.resolve(frame);
      }
    }
    return new Promise<Frame>((resolve: (frame: Frame) => void, reject: (error: Error) => void): void => {
      const timer = setTimeout((): void => {
        reject(new Error(`probe failed: no ${label} frame within ${timeoutMs}ms`));
      }, timeoutMs);
      this.waiters.push({
        predicate,
        resolve: (frame: Frame): void => {
          clearTimeout(timer);
          resolve(frame);
        },
      });
    });
  }
}

/**
 * Read the `run.id` field out of a `started` frame.
 *
 * @param frame The `started` frame.
 * @returns The run id, or null when the frame is malformed.
 */
function frameRunId(frame: Frame): string | null {
  const run = frame["run"];
  if (typeof run !== "object" || run === null) {
    return null;
  }
  const id = (run as Record<string, unknown>)["id"];
  return typeof id === "string" ? id : null;
}

/**
 * Run the full probe chain.
 *
 * @param options Entry passthrough options.
 */
export async function runProbe(options: ProbeOptions): Promise<void> {
  const watchdog = setTimeout((): void => {
    logger.error("remote probe timed out after 120s");
    process.exit(1);
  }, 120000);
  watchdog.unref?.();

  const stateDir = path.join(projectRoot, ".remote-probe");
  await rm(stateDir, { recursive: true, force: true });
  await ensureDir(stateDir);

  const posts: ReceiverPost[] = [];
  const receiver = Bun.serve({
    port: 0,
    async fetch(request: Request): Promise<Response> {
      if (request.method === "POST") {
        posts.push({
          path: new URL(request.url).pathname,
          body: await request.text(),
          title: request.headers.get("title"),
        });
      }
      return new Response("ok");
    },
  });
  await writeJson(path.join(stateDir, "config.json"), {
    ntfyTopic: "probe",
    ntfyBase: `http://127.0.0.1:${receiver.port}`,
  });

  const remote: RemoteServer = await startRemoteServer({ port: 0, stateDir });
  const url = `ws://127.0.0.1:${remote.port}/ws`;
  try {
    if (options.model !== null) {
      logger.info(`probe model passthrough: ${options.model} (consumed by pi chat sessions, not this probe)`);
    }

    // Unauthenticated hello is rejected with an error frame and a close.
    const stranger = await connect(url);
    const strangerStream = new FrameStream();
    stranger.addEventListener("message", (event: MessageEvent): void => {
      strangerStream.push(JSON.parse(String(event.data)) as Frame);
    });
    const closeCode = new Promise<number>((resolve: (code: number) => void): void => {
      stranger.addEventListener("close", (event: CloseEvent): void => resolve(event.code));
    });
    stranger.send(JSON.stringify({ type: "hello", token: "wrong-token" }));
    const rejection = await strangerStream.next((frame: Frame): boolean => frame["type"] === "error", "error frame for rejected hello");
    expect(typeof rejection["message"] === "string", "rejected hello carries an error message");
    expect(await closeCode === 4001, "rejected hello closes the socket with code 4001");

    // Authenticated chain: start, output, stdin, exited.
    const ws = await connect(url);
    const stream = new FrameStream();
    ws.addEventListener("message", (event: MessageEvent): void => {
      stream.push(JSON.parse(String(event.data)) as Frame);
    });
    ws.send(JSON.stringify({ type: "hello", token: remote.token }));
    await stream.next((frame: Frame): boolean => frame["type"] === "hello-ok", "hello-ok");

    const echoScript = [
      'console.log("PROBE-MARKER");',
      'process.stdin.once("data", (chunk) => { console.log("PROBE-ECHO:" + chunk.toString().trim()); process.exit(0); });',
    ].join(" ");
    ws.send(JSON.stringify({ type: "start", kind: "custom", ref: "probe child", argv: ["bun", "-e", echoScript] }));
    const started = await stream.next((frame: Frame): boolean => frame["type"] === "started", "started frame");
    const runId = frameRunId(started);
    expect(runId !== null, "started frame carries the run record");
    await stream.next(
      (frame: Frame): boolean => frame["type"] === "output" && typeof frame["chunk"] === "string" && frame["chunk"].includes("PROBE-MARKER"),
      "output frame carrying PROBE-MARKER",
    );
    ws.send(JSON.stringify({ type: "stdin", runId, line: "ping" }));
    await stream.next(
      (frame: Frame): boolean => frame["type"] === "output" && typeof frame["chunk"] === "string" && frame["chunk"].includes("PROBE-ECHO:ping"),
      "output frame echoing the stdin line",
    );
    const exited = await stream.next((frame: Frame): boolean => frame["type"] === "exited" && frame["runId"] === runId, "exited frame with code 0");
    expect(exited["code"] === 0, "probe child exits 0");

    // Synthetic dialog roundtrip through the daemon-side hook.
    const answer = remote.probeDialog();
    const dialog = await stream.next((frame: Frame): boolean => frame["type"] === "dialog", "dialog frame");
    const dialogId = dialog["dialogId"];
    expect(typeof dialogId === "string", "dialog frame carries a dialogId");
    ws.send(JSON.stringify({ type: "dialog-answer", dialogId, payload: { value: "probe-yes" } }));
    await stream.next((frame: Frame): boolean => frame["type"] === "dialog-resolved" && frame["dialogId"] === dialogId, "dialog-resolved frame");
    const resolved = await answer;
    expect(resolved.value === "probe-yes", "dialog answer routes back to the daemon-side asker");

    // Kill of a never-exiting child produces an exited frame.
    ws.send(JSON.stringify({ type: "start", kind: "custom", ref: "probe sleeper", argv: ["bun", "-e", "setTimeout(() => {}, 1e9)"] }));
    const sleeperStarted = await stream.next((frame: Frame): boolean => frame["type"] === "started", "sleeper started frame");
    const sleeperId = frameRunId(sleeperStarted);
    expect(sleeperId !== null, "sleeper started frame carries the run record");
    ws.send(JSON.stringify({ type: "kill", runId: sleeperId }));
    await stream.next((frame: Frame): boolean => frame["type"] === "exited" && frame["runId"] === sleeperId, "exited frame after kill");

    // Runner-mode gates: a daemon-spawned child poses makeRelay() dialogs.
    // The supervisor injects the dial-home env pair, so the fixture's web
    // relay dials back as a runner and its dialogs fan out as frames.
    const fixturePath = path.join(stateDir, "runner-fixture.ts");
    await writeFile(fixturePath, RUNNER_FIXTURE);
    ws.send(JSON.stringify({ type: "start", kind: "custom", ref: "probe runner", argv: ["bun", fixturePath] }));
    const runnerStarted = await stream.next((frame: Frame): boolean => frame["type"] === "started", "runner started frame");
    const runnerId = frameRunId(runnerStarted);
    expect(runnerId !== null, "runner started frame carries the run record");
    const runnerOutput: string[] = [];
    const collectRunnerOutput = (event: MessageEvent): void => {
      const frame = JSON.parse(String(event.data)) as Frame;
      if (frame["type"] === "output" && frame["runId"] === runnerId && typeof frame["chunk"] === "string") {
        runnerOutput.push(frame["chunk"]);
      }
    };
    ws.addEventListener("message", collectRunnerOutput);

    // Dialog 1 (select): answered over WS; the terminal's late line is discarded.
    const askDialog = await stream.next(
      (frame: Frame): boolean => frame["type"] === "dialog" && frame["title"] === "Probe runner select",
      "runner select dialog frame",
    );
    expect(typeof askDialog["dialogId"] === "string", "runner dialog frame carries a server dialogId");
    expect(askDialog["run"] === runnerId, "runner dialog frame carries the owning run id");
    expect(askDialog["blocking"] === true, "runner ask dialog is blocking (gate push eligible)");
    expect(Array.isArray(askDialog["options"]) && (askDialog["options"] as string[])[0] === "retry", "runner select dialog carries options");
    ws.send(JSON.stringify({ type: "dialog-answer", dialogId: askDialog["dialogId"], payload: { value: "retry" } }));
    await stream.next(
      (frame: Frame): boolean => frame["type"] === "dialog-resolved" && frame["dialogId"] === askDialog["dialogId"],
      "dialog-resolved for the runner select",
    );
    // Wait for the child's own echo before sending the late line, so the
    // web answer has provably already won locally.
    let echoed = false;
    const echoDeadline = Date.now() + 5000;
    while (!(echoed = runnerOutput.join("").includes("RUNNER-ASK:")) && Date.now() < echoDeadline) {
      await sleep(100);
    }
    expect(echoed, "runner printed its select resolution before the late terminal line");
    ws.send(JSON.stringify({ type: "stdin", runId: runnerId, line: "2" }));

    // Dialog 2 (orchestrator gate): free-text card, answered over WS.
    const gateDialog = await stream.next(
      (frame: Frame): boolean => frame["type"] === "dialog" && frame["title"] === "retry / skip / halt?",
      "runner orchestrator gate frame",
    );
    ws.send(JSON.stringify({ type: "dialog-answer", dialogId: gateDialog["dialogId"], payload: { value: "halt" } }));
    await stream.next(
      (frame: Frame): boolean => frame["type"] === "dialog-resolved" && frame["dialogId"] === gateDialog["dialogId"],
      "dialog-resolved for the runner gate",
    );

    // Dialog 3 (select): the terminal answers — the panel card is dismissed
    // via dialog-resolved with no panel answer at all.
    const webDialog = await stream.next(
      (frame: Frame): boolean => frame["type"] === "dialog" && frame["title"] === "Probe terminal wins",
      "runner terminal-wins dialog frame",
    );
    ws.send(JSON.stringify({ type: "stdin", runId: runnerId, line: "1" }));
    await stream.next(
      (frame: Frame): boolean => frame["type"] === "dialog-resolved" && frame["dialogId"] === webDialog["dialogId"],
      "dialog-resolved broadcast after the terminal answered (card dismissed)",
    );

    const runnerExited = await stream.next(
      (frame: Frame): boolean => frame["type"] === "exited" && frame["runId"] === runnerId,
      "runner exited frame",
    );
    expect(runnerExited["code"] === 0, "probe runner exits 0");
    ws.removeEventListener("message", collectRunnerOutput);
    const runnerOut = runnerOutput.join("");
    expect(runnerOut.includes('RUNNER-ASK:{"value":"retry"}'), "web answer won the select (value retry)");
    expect(runnerOut.split("RUNNER-ASK:").length - 1 === 1, "exactly one select resolution (late terminal answer discarded)");
    expect(runnerOut.includes("RUNNER-GATE:halt"), "orchestrator gate answered over WS (halt)");
    expect(runnerOut.includes('RUNNER-WEBWIN:{"value":"first"}'), "terminal answer won the last select (first)");

    // Launchables over HTTP: at least one real plan set plus every preset.
    const launchResponse = await fetch(`http://127.0.0.1:${remote.port}/api/launchables`, {
      headers: { Authorization: `Bearer ${remote.token}` },
    });
    expect(launchResponse.status === 200, "GET /api/launchables returns 200 with the bearer token");
    const launchables = await launchResponse.json() as { planSets?: unknown[]; presets?: { ref?: string }[] };
    expect((launchables.planSets ?? []).length >= 1, "launchables list at least one plan set from the real plans/ tree");
    for (const preset of PRESETS) {
      expect((launchables.presets ?? []).some((entry: { ref?: string }): boolean => entry.ref === preset.ref), `preset "${preset.ref}" listed`);
    }

    // The ntfy receiver got the run-exit POST (fixed-template body).
    const deadline = Date.now() + 5000;
    while (!posts.some((post: ReceiverPost): boolean => post.path === "/probe" && post.body.includes("PROBE-MARKER")) && Date.now() < deadline) {
      await sleep(100);
    }
    expect(
      posts.some((post: ReceiverPost): boolean => post.path === "/probe" && post.body.includes("PROBE-MARKER")),
      "ntfy receiver got the run-exit POST",
    );
    expect(
      posts.some((post: ReceiverPost): boolean => post.path === "/probe" && post.title === "remote: gate waiting"),
      "ntfy receiver got the gate-waiting POST for the blocking runner dialogs",
    );

    // Pi chat session: a daemon-owned pi child driven over WS end to end
    // (the `bun plans --probe` precedent — the interactive chain tests
    // itself). Skips (exit 0) only when pi is absent from PATH.
    if (Bun.which("pi") === null) {
      logger.warn("pi not on PATH - skipping the pi chat session leg of the probe");
    } else {
      ws.send(JSON.stringify({
        type: "pi-new",
        ...(options.model !== null ? { model: options.model } : {}),
      }));
      const sessionList = await stream.next((frame: Frame): boolean => frame["type"] === "pi-sessions", "pi-sessions frame");
      const listed = sessionList["sessions"];
      expect(Array.isArray(listed) && listed.length === 1, "pi-new registers exactly one session");
      const first = Array.isArray(listed) ? listed[0] : undefined;
      expect(typeof first === "object" && first !== null, "pi session entry is an object");
      const sessionId = (first as Record<string, unknown>)["sessionId"];
      expect(typeof sessionId === "string" && sessionId !== "", "pi session carries a non-empty string sessionId");
      ws.send(JSON.stringify({ type: "pi-prompt", sessionId, message: "Reply with exactly: REMOTE-OK" }));
      await stream.next(
        (frame: Frame): boolean => frame["type"] === "pi-settled" && frame["sessionId"] === sessionId,
        "pi-settled frame",
        90000,
      );
      ws.send(JSON.stringify({ type: "pi-last-text", sessionId }));
      const lastText = await stream.next(
        (frame: Frame): boolean => frame["type"] === "pi-last-text" && frame["sessionId"] === sessionId,
        "pi-last-text response frame",
      );
      expect(typeof lastText["text"] === "string" && lastText["text"] !== "", "pi last assistant text is non-empty");
      logger.info(`pi session replied: ${String(lastText["text"])}`);
      ws.send(JSON.stringify({ type: "pi-dispose", sessionId }));
      await stream.next(
        (frame: Frame): boolean => frame["type"] === "pi-exited" && frame["sessionId"] === sessionId,
        "pi-exited frame after dispose",
      );
    }

    clearTimeout(watchdog);
    logger.success(
      "remote probe passed: auth reject, start/output/stdin/exited, dialog roundtrip, kill, launchables, ntfy, runner-mode gates (first answer wins), pi chat session",
    );
  } finally {
    await remote.stop();
    receiver.stop(true);
    await rm(stateDir, { recursive: true, force: true });
  }
}
