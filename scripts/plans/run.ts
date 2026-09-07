import { basename, join } from "node:path";
import { logger } from "../utils/index.js";
import { PiRpc, type RpcFrame, type UiRequest, type UiResponsePayload } from "./rpc.js";
import { TerminalRelay } from "./relay.js";
import { streamEvent } from "./stream.js";
import { countTicks, isTicked, listPlanUnits, type PlanUnit } from "./set.js";

/** Options for one full plan-set run. */
export interface RunSetOptions {
  setDir: string;
  model?: string;
}

/** Terminal outcome of one unit across all its attempts. */
type UnitStatus = "done" | "skipped" | "failed";

/** Per-unit record for the final summary. */
interface UnitRecord {
  unit: PlanUnit;
  status: UnitStatus;
  detail: string;
  session: string | null;
}

/** Options for driving one fresh pi instance. */
interface DriveOptions {
  sessionName: string;
  prompt: string;
  model?: string;
  relay: TerminalRelay;
  onUiRequest: (request: UiRequest) => void;
}

/** The instance currently driven (steer/abort target, SIGINT victim). */
let current: PiRpc | null = null;

/**
 * Build the per-unit worker prompt.
 *
 * The `/skill:worker` prefix expands to the full worker SKILL.md inline, so
 * the spawned instance executes the plan contract by construction. On
 * continuation passes the prompt adds a nudge so the fresh instance resumes
 * at the first unticked task instead of redoing completed work.
 *
 * @param unitPath Absolute path to the unit file.
 * @param setDir Absolute path to the set folder.
 * @param continuation True on passes after the first.
 * @returns The prompt text.
 */
function buildUnitPrompt(unitPath: string, setDir: string, continuation: boolean): string {
  const lines = [
    `/skill:worker Execute the plan unit at ${unitPath}. Set context lives in ${join(setDir, "index.md")} — read it first for shared scope.`,
    "ask_user_question dialogs are relayed to a human operator at the terminal: use the tool for any load-bearing fork or clarification mid-task; free-text steering may also arrive from the operator.",
    "If you would hand back to plan (plan gap, invalid premise, blocked on an unticked dep), stop and report exactly that — leave every box unticked. The orchestrator treats an unflipped top marker as failure and asks the operator.",
  ];
  if (continuation) {
    lines.push(
      "A previous instance already completed the tasks ticked in this unit; continue from the first unticked task and do not redo ticked work.",
    );
  }
  return lines.join("\n");
}

/** The canned self-test prompt: exactly one ask_user_question call. */
const PROBE_PROMPT = [
  "Self-test: call the ask_user_question tool exactly once with one question:",
  'question "Probe: acknowledge?" with options "Acknowledge" and "Ignore" (no multiSelect).',
  "Do not call any other tool. When the tool result arrives, state the answer you received in one sentence, then stop.",
].join("\n");

/**
 * Spawn one fresh pi instance, deliver the prompt, relay its dialogs, and
 * return its final assistant text.
 *
 * @param options Session name, prompt, model, relay, and dialog hook.
 * @returns The last assistant message text.
 */
async function driveAgent(options: DriveOptions): Promise<string> {
  const rpc = new PiRpc({
    sessionName: options.sessionName,
    model: options.model,
    handlers: {
      onEvent: (event: RpcFrame): void => {
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

/** Dialog hook: answers relay dialogs through the live instance. */
interface DialogHook {
  (request: UiRequest): void;
}

/** Build the dialog hook that answers via the live instance's respondUi. */
function dialogHook(relay: TerminalRelay, onAsk?: () => void): DialogHook {
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
 * Interactive-chains self-test: spawn → dialog relay → response → settle →
 * report → clean exit.
 *
 * @param model Optional model pattern passed to `pi -m`.
 * @returns Process exit code.
 */
export async function runProbe(model?: string): Promise<number> {
  const relay = new TerminalRelay({
    isActive: (): boolean => current !== null,
    onSteer: (message: string): void => {
      current?.steer(message).catch((error: unknown): void => {
        logger.warn(`steer failed: ${(error as Error).message}`);
      });
    },
    onAbort: (): void => {
      current?.abort().catch((): void => {});
    },
  });
  relay.start();
  installSigint();
  let dialogs = 0;
  const report = await driveAgent({
    sessionName: "plans: probe",
    prompt: PROBE_PROMPT,
    model,
    relay,
    onUiRequest: dialogHook(relay, (): void => {
      dialogs += 1;
    }),
  });
  console.log(`\n${report}`);
  if (dialogs === 0) {
    logger.error("probe failed: no ask_user_question dialog arrived");
    return 1;
  }
  logger.success("probe complete: dialog relayed and answered, agent settled, report fetched");
  return 0;
}

/**
 * Run every unticked unit of a plan set, each in a fresh pi instance.
 *
 * Pre-ticked units are skipped. An unflipped marker auto-continues with a
 * fresh instance while ticks keep progressing; an attempt with no new ticks
 * reaches the failure gate: retry (fresh instance) / skip / halt. Exit code
 * is 0 only when every unit ended done or was pre-ticked.
 *
 * @param options Set folder (absolute) and optional model pattern.
 * @returns Process exit code.
 */
export async function runSet(options: RunSetOptions): Promise<number> {
  const units = listPlanUnits(options.setDir);
  const setName = basename(options.setDir);
  const relay = new TerminalRelay({
    isActive: (): boolean => current !== null,
    onSteer: (message: string): void => {
      current?.steer(message).catch((error: unknown): void => {
        logger.warn(`steer failed: ${(error as Error).message}`);
      });
    },
    onAbort: (): void => {
      current?.abort().catch((): void => {});
    },
  });
  relay.start();
  installSigint();
  logger.info(`plan set ${setName} · ${units.length} unit(s)`);
  const records: UnitRecord[] = [];
  let halted = false;
  for (const unit of units) {
    if (isTicked(unit.path)) {
      logger.info(`skip ${unit.name} (top marker [x])`);
      records.push({ unit, status: "skipped", detail: "pre-ticked", session: null });
      continue;
    }
    const outcome = await runUnitWithGate(unit, options, relay, setName);
    records.push(outcome.record);
    if (outcome.halted) {
      halted = true;
      break;
    }
  }
  printSummary(records, halted);
  const complete = !halted && records.every((record: UnitRecord): boolean => record.status !== "failed");
  return complete ? 0 : 1;
}

/** Gate outcome: the settled unit record plus whether the operator halted. */
interface GateOutcome {
  record: UnitRecord;
  halted: boolean;
}

/**
 * Drive one unit to completion: each attempt is a fresh instance, and an
 * unflipped marker auto-continues while ticks progress; an attempt with no
 * new ticks (rejection, block, no-op settle) reaches the operator gate —
 * retry / skip / halt.
 *
 * @param unit The plan unit file.
 * @param options Run options (set folder, model).
 * @param relay The shared terminal relay.
 * @param setName Set folder basename, for session names.
 * @returns The unit record, with a halt flag when the operator halted.
 */
async function runUnitWithGate(
  unit: PlanUnit,
  options: RunSetOptions,
  relay: TerminalRelay,
  setName: string,
): Promise<GateOutcome> {
  for (let attempt = 1; ; attempt++) {
    const suffix = attempt === 1 ? "" : ` (pass ${attempt})`;
    const sessionName = `plans: ${setName}/${unit.name}${suffix}`;
    logger.info(`\n── ${unit.name} · session ${sessionName} ──`);
    console.log('  (type to steer the worker · ".stop" aborts it)\n');
    const ticksBefore = countTicks(unit.path);
    const report = await driveAgent({
      sessionName,
      prompt: buildUnitPrompt(unit.path, options.setDir, attempt > 1),
      model: options.model,
      relay,
      onUiRequest: dialogHook(relay),
    });
    console.log(`\n── worker report (${unit.name}) ──\n${report}\n`);
    if (isTicked(unit.path)) {
      return { record: { unit, status: "done", detail: `attempt ${attempt}`, session: sessionName }, halted: false };
    }
    const ticksAfter = countTicks(unit.path);
    if (ticksAfter > ticksBefore) {
      logger.info(
        `progress: ${ticksAfter - ticksBefore} new tick(s) in ${unit.name}, marker still unflipped — continuing with a fresh instance (Ctrl-C stops)`,
      );
      continue;
    }
    const gate = await askGate(relay, unit.name);
    if (gate === "retry") {
      continue;
    }
    if (gate === "skip") {
      return {
        record: {
          unit,
          status: "failed",
          detail: `gate: skipped after ${attempt} attempt(s), marker unflipped`,
          session: sessionName,
        },
        halted: false,
      };
    }
    return {
      record: { unit, status: "failed", detail: `gate: halted after ${attempt} attempt(s)`, session: sessionName },
      halted: true,
    };
  }
}

/**
 * The failure gate: ask the operator what to do with an unflipped unit.
 *
 * @param relay The shared terminal relay.
 * @param unitName Unit filename, for the prompt text.
 * @returns The chosen operator action.
 */
async function askGate(relay: TerminalRelay, unitName: string): Promise<"retry" | "skip" | "halt"> {
  for (;;) {
    const line = (await relay.askOrchestrator(`${unitName}: top marker not flipped — retry / skip / halt?`)).trim().toLowerCase();
    if (line === "r" || line === "retry") {
      return "retry";
    }
    if (line === "s" || line === "skip") {
      return "skip";
    }
    if (line === "h" || line === "halt") {
      return "halt";
    }
    console.log('  (r=retry with a fresh instance · s=skip this unit · h=halt the run)');
  }
}

/** Print the per-unit summary with session names for audit. */
function printSummary(records: UnitRecord[], halted: boolean): void {
  logger.info("── summary ──");
  for (const record of records) {
    const session = record.session === null ? "" : ` · ${record.session}`;
    logger.info(`  ${record.unit.name}  ${record.status}  (${record.detail})${session}`);
  }
  if (halted) {
    logger.warn("run halted by operator; remaining units not started");
  }
}

/**
 * SIGINT: abort and reap the current child, then exit 1 without starting
 * the next unit.
 */
function installSigint(): void {
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
