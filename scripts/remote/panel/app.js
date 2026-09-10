// Phone-first panel: token gate, WS frames, run feeds, launcher, dialogs,
// pi chat sessions. Vanilla ES module + WS; no framework, no build step.

const { WebSocket, localStorage, location, fetch } = globalThis;

const TOKEN_KEY = "remote.token";
const OUTPUT_CAP = 30000;
const PI_TOOL_SUMMARY_MAX = 120;
const PI_FEED_ROW_CAP = 400;

let token = localStorage.getItem(TOKEN_KEY) ?? "";
let socket = null;
let connected = false;
let reconnectTimer = null;

const els = {
  status: document.getElementById("status"),
  gate: document.getElementById("token-gate"),
  tokenInput: document.getElementById("token"),
  connect: document.getElementById("connect"),
  main: document.getElementById("main"),
  banner: document.getElementById("banner"),
  planSets: document.getElementById("plan-sets"),
  presets: document.getElementById("presets"),
  customCommand: document.getElementById("custom-command"),
  customStart: document.getElementById("custom-start"),
  dialogList: document.getElementById("dialog-list"),
  runList: document.getElementById("run-list"),
  piModel: document.getElementById("pi-model"),
  piNew: document.getElementById("pi-new"),
  piSessionList: document.getElementById("pi-session-list"),
};

const runCards = new Map();
const gateCards = new Map();
const piSessions = new Map();
let notifyCard = null;

function send(frame) {
  if (socket !== null && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(frame));
  }
}

function setStatus(on, label) {
  connected = on;
  els.status.textContent = label;
  els.status.classList.toggle("on", on);
  els.status.classList.toggle("off", !on);
}

function showGate(hint) {
  els.gate.classList.remove("hidden");
  els.main.classList.add("hidden");
  if (typeof hint === "string") {
    els.gate.querySelector("p").textContent = hint;
  }
}

function enterPanel() {
  els.gate.classList.add("hidden");
  els.main.classList.remove("hidden");
  setStatus(true, "online");
  loadLaunchables();
  send({ type: "runs" });
  send({ type: "pi-list" });
}

function connect() {
  if (token === "") {
    showGate("Enter the panel token from the laptop:");
    return;
  }
  if (reconnectTimer !== null) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  setStatus(false, "connecting");
  socket = new WebSocket(`ws://${location.host}/ws`);
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "hello", token }));
  });
  socket.addEventListener("message", (event) => {
    handleFrame(JSON.parse(String(event.data)));
  });
  socket.addEventListener("close", () => {
    setStatus(false, "offline");
    if (token !== "") {
      reconnectTimer = setTimeout(connect, 3000);
    }
  });
}

function handleFrame(frame) {
  if (frame.type === "hello-ok") {
    enterPanel();
    return;
  }
  if (frame.type === "error") {
    if (!connected && typeof frame.message === "string" && frame.message.includes("token")) {
      showGate(`${frame.message} - enter the panel token from the laptop (cat .remote/token):`);
    }
    return;
  }
  if (frame.type === "started") {
    addRun(frame.run);
    return;
  }
  if (frame.type === "output") {
    appendOutput(frame.runId, frame.chunk);
    return;
  }
  if (frame.type === "exited") {
    markExited(frame.runId, frame.code);
    return;
  }
  if (frame.type === "runs") {
    reconcileRuns(frame.runs ?? []);
    return;
  }
  if (frame.type === "dialog") {
    addDialog(frame);
    return;
  }
  if (frame.type === "dialog-resolved") {
    removeDialog(frame.dialogId);
    return;
  }
  if (frame.type === "pi-sessions") {
    reconcilePiSessions(Array.isArray(frame.sessions) ? frame.sessions : []);
    return;
  }
  if (frame.type === "pi-event") {
    piAppendEvent(frame.sessionId, frame.frame);
    return;
  }
  if (frame.type === "pi-settled") {
    piMarkSettled(frame.sessionId);
    return;
  }
  if (frame.type === "pi-exited") {
    piMarkEnded(frame.sessionId);
  }
}

function updateBanner() {
  const mergeLive = [...runCards.values()].some((card) => card.dataset.merge === "true" && !card.classList.contains("exited"));
  els.banner.textContent = "A merge run is live - avoid main-tree dist rebuilds (coverage / bench / bundle) while its union gate runs.";
  els.banner.classList.toggle("hidden", !mergeLive);
}

function runCard(run) {
  const card = document.createElement("div");
  card.className = "run";

  const head = document.createElement("div");
  head.className = "head";
  const cmd = document.createElement("span");
  cmd.className = "cmd";
  cmd.textContent = run.command;
  const exit = document.createElement("span");
  exit.className = "exit";
  head.append(cmd, exit);

  const output = document.createElement("pre");

  const controls = document.createElement("div");
  controls.className = "controls";
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.placeholder = "stdin line";
  const sendButton = document.createElement("button");
  sendButton.type = "button";
  sendButton.textContent = "Send";
  sendButton.addEventListener("click", () => {
    send({ type: "stdin", runId: run.id, line: input.value });
    input.value = "";
  });
  const killButton = document.createElement("button");
  killButton.type = "button";
  killButton.className = "danger";
  killButton.textContent = "Kill";
  killButton.addEventListener("click", () => {
    send({ type: "kill", runId: run.id });
  });
  controls.append(input, sendButton, killButton);

  card.append(head, output, controls);
  return { card, output, exit, input, sendButton, killButton };
}

function addRun(run) {
  if (runCards.has(run.id)) {
    return;
  }
  const parts = runCard(run);
  parts.card.dataset.merge = String(run.command === "bun merge" || run.command.startsWith("bun merge "));
  runCards.set(run.id, parts);
  els.runList.prepend(parts.card);
  updateEmpty(els.runList, "No runs yet.");
  updateBanner();
}

function appendOutput(runId, chunk) {
  const parts = runCards.get(runId);
  if (parts === undefined || typeof chunk !== "string") {
    return;
  }
  parts.output.textContent += chunk;
  if (parts.output.textContent.length > OUTPUT_CAP) {
    parts.output.textContent = parts.output.textContent.slice(-OUTPUT_CAP);
  }
  parts.output.scrollTop = parts.output.scrollHeight;
}

function markExited(runId, code) {
  const parts = runCards.get(runId);
  if (parts === undefined) {
    return;
  }
  parts.card.classList.add("exited");
  parts.exit.textContent = `exited (${code})`;
  parts.input.disabled = true;
  parts.sendButton.disabled = true;
  parts.killButton.disabled = true;
  updateBanner();
}

function reconcileRuns(runs) {
  for (const run of runs) {
    addRun(run);
  }
}

// --- Pi chat sessions (client-side mirror of stream.ts's one-liners) ---

function piSessionCard(session) {
  const card = document.createElement("div");
  card.className = "pi-session";

  const head = document.createElement("div");
  head.className = "head";
  const meta = document.createElement("div");
  meta.className = "meta";
  const title = document.createElement("span");
  title.className = "title";
  title.textContent = typeof session.sessionName === "string" ? session.sessionName : session.sessionId;
  const sub = document.createElement("span");
  sub.className = "sub";
  const modelLabel = typeof session.model === "string" && session.model !== "" ? session.model : "default model";
  sub.textContent = modelLabel;
  meta.append(title, sub);
  const endButton = document.createElement("button");
  endButton.type = "button";
  endButton.className = "danger";
  endButton.textContent = "End";
  endButton.addEventListener("click", () => {
    send({ type: "pi-dispose", sessionId: session.sessionId });
  });
  head.append(meta, endButton);

  const feed = document.createElement("div");
  feed.className = "pi-feed";

  const promptControls = document.createElement("div");
  promptControls.className = "controls";
  const promptInput = document.createElement("input");
  promptInput.type = "text";
  promptInput.autocomplete = "off";
  promptInput.spellcheck = false;
  promptInput.placeholder = "prompt";
  const promptButton = document.createElement("button");
  promptButton.type = "button";
  promptButton.textContent = "Send";
  const sendPrompt = () => {
    const message = promptInput.value.trim();
    if (message === "") {
      return;
    }
    send({ type: "pi-prompt", sessionId: session.sessionId, message });
    promptInput.value = "";
    piSetBusy(parts, true);
  };
  promptButton.addEventListener("click", sendPrompt);
  promptInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendPrompt();
    }
  });
  promptControls.append(promptInput, promptButton);

  const steerControls = document.createElement("div");
  steerControls.className = "controls";
  const steerInput = document.createElement("input");
  steerInput.type = "text";
  steerInput.autocomplete = "off";
  steerInput.spellcheck = false;
  steerInput.placeholder = "steer the active run";
  const steerButton = document.createElement("button");
  steerButton.type = "button";
  steerButton.textContent = "Steer";
  const sendSteer = () => {
    const message = steerInput.value.trim();
    if (message === "") {
      return;
    }
    send({ type: "pi-steer", sessionId: session.sessionId, message });
    steerInput.value = "";
  };
  steerButton.addEventListener("click", sendSteer);
  steerInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      sendSteer();
    }
  });
  const abortButton = document.createElement("button");
  abortButton.type = "button";
  abortButton.className = "danger";
  abortButton.textContent = "Abort";
  abortButton.addEventListener("click", () => {
    send({ type: "pi-abort", sessionId: session.sessionId });
  });
  steerControls.append(steerInput, steerButton, abortButton);

  card.append(head, feed, promptControls, steerControls);
  const parts = {
    card,
    sub,
    modelLabel,
    feed,
    promptInput,
    promptButton,
    steerInput,
    steerButton,
    abortButton,
    endButton,
    assistant: null,
    tools: new Map(),
  };
  return parts;
}

function piSetBusy(parts, busy) {
  parts.promptInput.disabled = busy;
  parts.promptButton.disabled = busy;
  parts.steerInput.disabled = !busy;
  parts.steerButton.disabled = !busy;
  parts.abortButton.disabled = !busy;
  parts.sub.textContent = busy ? `${parts.modelLabel} - working` : `${parts.modelLabel} - idle`;
}

function reconcilePiSessions(sessions) {
  const live = new Set();
  for (const session of sessions) {
    if (session === null || typeof session !== "object" || typeof session.sessionId !== "string") {
      continue;
    }
    live.add(session.sessionId);
    if (!piSessions.has(session.sessionId)) {
      const parts = piSessionCard(session);
      piSessions.set(session.sessionId, parts);
      els.piSessionList.prepend(parts.card);
      piSetBusy(parts, false);
    }
  }
  for (const [sessionId, parts] of piSessions) {
    if (!live.has(sessionId)) {
      piSessions.delete(sessionId);
      parts.card.remove();
    }
  }
  updateEmpty(els.piSessionList, "No pi sessions.");
}

function piMarkSettled(sessionId) {
  const parts = piSessions.get(sessionId);
  if (parts === undefined) {
    return;
  }
  piSetBusy(parts, false);
  parts.assistant = null;
}

function piMarkEnded(sessionId) {
  const parts = piSessions.get(sessionId);
  if (parts === undefined) {
    return;
  }
  parts.card.classList.add("ended");
  parts.sub.textContent = "ended";
  for (const control of [parts.promptInput, parts.promptButton, parts.steerInput, parts.steerButton, parts.abortButton, parts.endButton]) {
    control.disabled = true;
  }
}

function piAppendEvent(sessionId, frame) {
  const parts = piSessions.get(sessionId);
  if (parts === undefined || frame === null || typeof frame !== "object") {
    return;
  }
  if (frame.type === "message_update") {
    const inner = frame.assistantMessageEvent;
    if (inner !== null && typeof inner === "object" && inner.type === "text_delta" && typeof inner.delta === "string") {
      piAppendAssistant(parts, inner.delta);
    }
    return;
  }
  if (frame.type === "tool_execution_start") {
    const args = piSummarizeArgs(frame.args);
    const row = piAppendLine(parts, `· ${String(frame.toolName)}${args === "" ? "" : ` ${args}`} …`);
    parts.tools.set(String(frame.toolCallId), { row, printed: 0 });
    return;
  }
  if (frame.type === "tool_execution_update") {
    piStreamUpdate(parts, String(frame.toolCallId), piResultText(frame.partialResult));
    return;
  }
  if (frame.type === "tool_execution_end") {
    piStreamEnd(parts, frame);
    return;
  }
  piAppendLine(parts, `· ${String(frame.type)}`, "dim");
}

function piAppendAssistant(parts, delta) {
  if (delta === "") {
    return;
  }
  if (parts.assistant === null) {
    const bubble = document.createElement("div");
    bubble.className = "pi-assistant";
    parts.feed.append(bubble);
    parts.assistant = bubble;
    piCapFeed(parts);
  }
  parts.assistant.textContent += delta;
  parts.feed.scrollTop = parts.feed.scrollHeight;
}

function piAppendLine(parts, text, extraClass) {
  const row = document.createElement("div");
  row.className = typeof extraClass === "string" ? `pi-line ${extraClass}` : "pi-line";
  row.textContent = text;
  parts.feed.append(row);
  piCapFeed(parts);
  parts.feed.scrollTop = parts.feed.scrollHeight;
  return row;
}

function piCapFeed(parts) {
  while (parts.feed.childElementCount > PI_FEED_ROW_CAP) {
    parts.feed.firstElementChild?.remove();
  }
}

function piStreamUpdate(parts, callId, text) {
  const tool = parts.tools.get(callId);
  if (tool === undefined) {
    return;
  }
  if (text.length < tool.printed) {
    // The accumulated output was rewritten, not extended - resync silently.
    tool.printed = text.length;
    return;
  }
  if (text.length > tool.printed) {
    tool.row.textContent += text.slice(tool.printed);
    tool.printed = text.length;
    parts.feed.scrollTop = parts.feed.scrollHeight;
  }
}

function piStreamEnd(parts, frame) {
  const callId = String(frame.toolCallId);
  const name = String(frame.toolName);
  const failed = frame.isError === true;
  const status = failed ? "ERROR" : "done";
  const tool = parts.tools.get(callId);
  if (tool === undefined) {
    const summary = piFlatten(piResultText(frame.result));
    piAppendLine(parts, `· ${name} ${status}${summary === "" ? "" : ` · ${summary}`}`);
    return;
  }
  parts.tools.delete(callId);
  const text = piResultText(frame.result);
  if (text.length > tool.printed) {
    tool.row.textContent += text.slice(tool.printed);
  }
  if (tool.printed > 0) {
    tool.row.textContent += ` · ${name} ${status}`;
    return;
  }
  const summary = piFlatten(text);
  tool.row.textContent += ` · ${name} ${status}${summary === "" ? "" : ` · ${summary}`}`;
}

function piFlatten(text) {
  const line = text.split("\n").map((part) => part.trim()).filter((part) => part.length > 0).join(" ");
  return line.length > PI_TOOL_SUMMARY_MAX ? `${line.slice(0, PI_TOOL_SUMMARY_MAX - 1)}…` : line;
}

function piSummarizeArgs(args) {
  if (args === null || typeof args !== "object") {
    return "";
  }
  const preferred = ["command", "path", "file_path", "pattern", "url"];
  let value;
  for (const key of preferred) {
    if (typeof args[key] === "string") {
      value = args[key];
      break;
    }
  }
  if (value === undefined) {
    value = Object.values(args).find((candidate) => typeof candidate === "string");
  }
  return typeof value === "string" ? piFlatten(value) : "";
}

function piResultText(payload) {
  if (payload === null || typeof payload !== "object") {
    return "";
  }
  const content = payload.content;
  if (!Array.isArray(content)) {
    return "";
  }
  let text = "";
  for (const part of content) {
    if (part !== null && typeof part === "object" && part.type === "text" && typeof part.text === "string") {
      text += part.text;
    }
  }
  return text;
}

function dialogCard(frame) {
  const card = document.createElement("div");
  card.className = "dialog";
  const title = document.createElement("h3");
  title.textContent = frame.title ?? "Dialog";
  const message = document.createElement("p");
  message.textContent = frame.message ?? "";
  card.append(title, message);

  const answer = (payload) => {
    send({ type: "dialog-answer", dialogId: frame.dialogId, payload });
  };

  if (Array.isArray(frame.options) && frame.options.length > 0) {
    const options = document.createElement("div");
    options.className = "options";
    for (const option of frame.options) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = option;
      button.addEventListener("click", () => answer({ value: option }));
      options.append(button);
    }
    card.append(options);
    return card;
  }

  const free = document.createElement("div");
  free.className = "free";
  const input = document.createElement("input");
  input.type = "text";
  input.autocomplete = "off";
  input.spellcheck = false;
  if (typeof frame.placeholder === "string" && frame.placeholder !== "") {
    input.placeholder = frame.placeholder;
  }
  if (typeof frame.prefill === "string" && frame.prefill !== "") {
    input.value = frame.prefill;
  }
  const submit = document.createElement("button");
  submit.type = "button";
  submit.textContent = "Answer";
  submit.addEventListener("click", () => {
    answer({ value: input.value });
  });
  free.append(input, submit);
  card.append(free);
  return card;
}

function addDialog(frame) {
  if (typeof frame.dialogId !== "string") {
    return;
  }
  if (frame.blocking === true) {
    addGateCard(frame);
    return;
  }
  addNotifyCard(frame);
}

// Blocking dialogs (gates) surface at the top of the run feed, tagged with
// the run id, so they outrank every run card while they wait.
function addGateCard(frame) {
  if (gateCards.has(frame.dialogId)) {
    return;
  }
  const card = dialogCard(frame);
  const kicker = document.createElement("p");
  kicker.textContent = typeof frame.run === "string" && frame.run !== "" ? `gate waiting - ${frame.run}` : "gate waiting";
  card.prepend(kicker);
  card.dataset.dialogId = frame.dialogId;
  gateCards.set(frame.dialogId, card);
  els.runList.prepend(card);
  updateEmpty(els.runList, "No runs yet.");
}

// Fire-and-forget notifies render as one status card: each replaces the
// previous one (they have no answer path and never resolve).
function addNotifyCard(frame) {
  if (notifyCard !== null) {
    notifyCard.remove();
  }
  const card = document.createElement("div");
  card.className = "dialog";
  const title = document.createElement("h3");
  title.textContent = frame.title ?? "Note";
  const message = document.createElement("p");
  message.textContent = frame.message ?? "";
  card.append(title, message);
  card.dataset.dialogId = frame.dialogId;
  notifyCard = card;
  els.dialogList.prepend(card);
  updateEmpty(els.dialogList, "No dialogs waiting.");
}

function removeDialog(dialogId) {
  const gate = gateCards.get(dialogId);
  if (gate !== undefined) {
    gateCards.delete(dialogId);
    gate.remove();
    updateEmpty(els.runList, "No runs yet.");
    return;
  }
  const card = els.dialogList.querySelector(`[data-dialog-id="${dialogId}"]`);
  if (card !== null) {
    if (notifyCard === card) {
      notifyCard = null;
    }
    card.remove();
    updateEmpty(els.dialogList, "No dialogs waiting.");
  }
}

function launchCard(title, sub, onStart) {
  const card = document.createElement("div");
  card.className = "card";
  const meta = document.createElement("div");
  meta.className = "meta";
  const titleEl = document.createElement("span");
  titleEl.className = "title";
  titleEl.textContent = title;
  const subEl = document.createElement("span");
  subEl.className = "sub";
  subEl.textContent = sub;
  meta.append(titleEl, subEl);
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Start";
  button.addEventListener("click", onStart);
  card.append(meta, button);
  return card;
}

async function loadLaunchables() {
  const response = await fetch("/api/launchables", { headers: { Authorization: `Bearer ${token}` } });
  if (response.status !== 200) {
    showGate("Token rejected - enter the panel token from the laptop (cat .remote/token):");
    return;
  }
  const launchables = await response.json();
  els.planSets.replaceChildren(
    ...launchables.planSets.map((set) =>
      launchCard(set.label, `${set.units} units - ${set.ref}`, () => {
        send({ type: "start", kind: "plan-set", ref: set.ref });
      })),
  );
  if (launchables.planSets.length === 0) {
    const empty = document.createElement("span");
    empty.className = "empty";
    empty.textContent = "No plan sets found.";
    els.planSets.replaceChildren(empty);
  }
  els.presets.replaceChildren(
    ...launchables.presets.map((preset) =>
      launchCard(preset.label, "preset", () => {
        send({ type: "start", kind: "preset", ref: preset.ref });
      })),
  );
}

function updateEmpty(list, text) {
  const hasContent = list.querySelector(":scope > *:not(.empty)") !== null;
  const empty = list.querySelector(".empty");
  if (!hasContent && empty === null) {
    const el = document.createElement("span");
    el.className = "empty";
    el.textContent = text;
    list.append(el);
  } else if (hasContent && empty !== null) {
    empty.remove();
  }
}

els.connect.addEventListener("click", () => {
  token = els.tokenInput.value.trim();
  localStorage.setItem(TOKEN_KEY, token);
  connect();
});

els.tokenInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    els.connect.click();
  }
});

els.customStart.addEventListener("click", () => {
  const command = els.customCommand.value.trim();
  if (command === "") {
    return;
  }
  send({ type: "start", kind: "custom", ref: command });
});

els.piNew.addEventListener("click", () => {
  const model = els.piModel.value.trim();
  els.piModel.value = "";
  send(model === "" ? { type: "pi-new" } : { type: "pi-new", model });
});

updateEmpty(els.dialogList, "No dialogs waiting.");
updateEmpty(els.runList, "No runs yet.");
updateEmpty(els.piSessionList, "No pi sessions.");
els.tokenInput.value = token;
connect();
