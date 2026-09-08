import { existsSync } from "node:fs";
import { basename, join, relative, resolve } from "node:path";
import { execCommand, logger, projectRoot } from "../utils/index.js";
import { PiRpc, type RpcFrame, type UiRequest, type UiResponsePayload } from "./rpc.js";
import { TerminalRelay } from "./relay.js";
import { streamEvent } from "./stream.js";
import { countTicks, isTicked, listPlanUnits, partitionComponents, type PlanUnit } from "./set.js";

/** Execution mode over the worktree venue (spec D9). */
export type WorktreeMode = "single" | "split";

/** Options for one full plan-set run. */
export interface RunSetOptions {
  setDir: string;
  model?: string;
  mode: WorktreeMode;
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

/** One execution venue: a worktree slug plus the units that run inside it. */
interface Venue {
  slug: string;
  units: PlanUnit[];
}

/** Options for driving one fresh pi instance. */
interface DriveOptions {
  sessionName: string;
  prompt: string;
  model?: string;
  relay: TerminalRelay;
  onUiRequest: (request: UiRequest) => void;
}

/** The bundled worktree protocol script. Invoked read-only (list/status) plus `clean` on explicit abandon. */
const WORKTREE_SCRIPT = join(".agents", "skills", "worker", "scripts", "worktree.mjs");

/** Protocol worktrees live in a sibling dir (worktree.mjs owns the layout). */
const WT_ROOT = resolve(projectRoot, "..", "hellajs-wt");

/** The instance currently driven (steer/abort target, SIGINT victim). */
let current: PiRpc | null = null;

/**
 * Derive the set slug from the set folder path (stable, filesystem-safe).
 *
 * @param setDir Absolute path to the plan-set folder.
 * @returns Kebab-case slug unique to the set.
 */
function setSlug(setDir: string): string {
  return relative(projectRoot, setDir)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build the per-unit worker prompt against the worktree copy of the set.
 *
 * The `/skill:worker` prefix expands to the full worker SKILL.md inline, so
 * the spawned instance provisions or re-enters the named slug by construction
 * and ticks the worktree copy — main-tree copies stay `[ ]` until merge, and
 * that is success, not failure. On continuation passes the prompt adds a
 * nudge so the fresh instance resumes at the first unticked task.
 *
 * @param wtUnitPath Absolute path to the worktree copy of the unit file.
 * @param wtSetDir Absolute path to the worktree copy of the set folder.
 * @param slug The target worktree slug.
 * @param continuation True on passes after the first.
 * @returns The prompt text.
 */
function buildUnitPrompt(wtUnitPath: string, wtSetDir: string, slug: string, continuation: boolean): string {
  const lines = [
    `/skill:worker Execute the plan unit at ${wtUnitPath}. Set context lives in ${join(wtSetDir, "index.md")} — read it first for shared scope.`,
    `Your target worktree slug is "${slug}": provision it or re-enter the existing one per the Provision step (never a duplicate), then execute every step inside that worktree — ticks land on the worktree copy named above.`,
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
 * Read a tick count from a worktree copy that provisioning may not have
 * created yet.
 *
 * @param unitPath Absolute path to a (possibly absent) unit file.
 * @returns Tick count, 0 when the file does not exist.
 */
function worktreeTicks(unitPath: string): number {
  return existsSync(unitPath) ? countTicks(unitPath) : 0;
}

/**
 * Read the top marker from a worktree copy that provisioning may not have
 * created yet.
 *
 * @param unitPath Absolute path to a (possibly absent) unit file.
 * @returns True only when the file exists and reads `[x]`.
 */
function worktreeTicked(unitPath: string): boolean {
  return existsSync(unitPath) && isTicked(unitPath);
}

/**
 * Run the bundled worktree script and print its output (orchestrator status).
 *
 * @param args Script arguments (read-only `list`/`status`, or `clean` on abandon).
 * @returns Captured stdout, or null when the script itself failed (reported).
 */
async function worktreeScript(args: string[]): Promise<string | null> {
  try {
    const result = await execCommand("bun", [WORKTREE_SCRIPT, ...args]);
    return result.stdout;
  } catch (error) {
    logger.warn(`worktree.mjs ${args.join(" ")} failed: ${(error as Error).message.split("\n")[0]}`);
    return null;
  }
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
 * Run every unticked unit of a plan set, each in a fresh pi instance, inside
 * per-component worktree venues.
 *
 * Pre-ticked units (merged state — the main-tree markers are the merged-state
 * input for unit selection) are skipped. An unflipped worktree marker
 * auto-continues with a fresh instance while ticks keep progressing; an
 * attempt with no new ticks reaches the failure gate: retry / deliver-
 * incomplete / abandon / halt. A completed component reaches the merge
 * checkpoint: merge now (spawns a `/skill:merge` instance) / continue (split
 * mode, next component) / halt. Exit code is 0 only when every unit ended
 * done or was pre-ticked.
 *
 * @param options Set folder (absolute), optional model pattern, worktree mode.
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
  const inventory = await worktreeScript(["list"]);
  if (inventory !== null && !inventory.includes("(no protocol worktrees)")) {
    logger.info(`existing protocol worktrees:\n${inventory.trimEnd()}`);
  }
  const venues: Venue[] =
    options.mode === "split"
      ? partitionComponents(units).map((component: PlanUnit[]): Venue => ({
          slug: `${setSlug(options.setDir)}-${component[0]?.name.replace(/\.md$/, "") ?? "component"}`,
          units: component,
        }))
      : [{ slug: setSlug(options.setDir), units }];
  logger.info(`plan set ${setName} · ${units.length} unit(s) · mode ${options.mode} · ${venues.length} venue(s)`);
  const records: UnitRecord[] = [];
  let halted = false;
  for (const venue of venues) {
    if (venue.units.every((unit: PlanUnit): boolean => isTicked(unit.path))) {
      for (const unit of venue.units) {
        logger.info(`skip ${unit.name} (main-tree marker [x] — already merged)`);
        records.push({ unit, status: "skipped", detail: "pre-ticked", session: null });
      }
      continue;
    }
    const outcome = await runVenue(venue, options, relay, setName, records);
    if (outcome.halted) {
      halted = true;
      break;
    }
    if (outcome.failedCount > 0) {
      logger.warn(`component ${venue.slug} incomplete — its merge checkpoint is skipped (merge would refuse it)`);
      continue;
    }
    const isLastVenue = venue === venues[venues.length - 1];
    const choice = await askCheckpoint(relay, venue, options.mode, isLastVenue);
    if (choice === "halt") {
      halted = true;
      break;
    }
    if (choice === "merge") {
      await runMergeInstance(options.setDir, setName, relay, options.model);
    }
  }
  printSummary(records, halted);
  const complete = !halted && records.every((record: UnitRecord): boolean => record.status !== "failed");
  return complete ? 0 : 1;
}

/** Venue outcome: failure count plus whether the operator halted everything. */
interface VenueOutcome {
  failedCount: number;
  halted: boolean;
}

/**
 * Drive one venue's pending units to completion inside its worktree.
 *
 * On a failure gate (deliver-incomplete / abandon) the venue's remaining
 * units are not started: a component is dependency-connected, so its later
 * units are blocked on the failed one (the worker's own Step 0 gate would
 * refuse them anyway).
 *
 * @param venue The worktree slug and its units.
 * @param options Run options (set folder, model, mode).
 * @param relay The shared terminal relay.
 * @param setName Set folder basename, for session names.
 * @param records Accumulator for the final summary.
 * @returns Failure count and the halt flag.
 */
async function runVenue(
  venue: Venue,
  options: RunSetOptions,
  relay: TerminalRelay,
  setName: string,
  records: UnitRecord[],
): Promise<VenueOutcome> {
  const relSetDir = relative(projectRoot, options.setDir);
  const wtSetDir = join(WT_ROOT, venue.slug, relSetDir);
  let failedCount = 0;
  for (const unit of venue.units) {
    if (isTicked(unit.path)) {
      logger.info(`skip ${unit.name} (main-tree marker [x] — already merged)`);
      records.push({ unit, status: "skipped", detail: "pre-ticked", session: null });
      continue;
    }
    const wtUnitPath = join(wtSetDir, unit.name);
    const outcome = await runUnitWithGate(wtUnitPath, wtSetDir, venue.slug, unit, options, relay, setName);
    records.push(outcome.record);
    if (outcome.action === "halted") {
      return { failedCount: failedCount + 1, halted: true };
    }
    if (outcome.action === "abandoned") {
      return { failedCount: failedCount + 1, halted: false };
    }
    if (outcome.action === "delivered") {
      failedCount += 1; // recorded failed; independent later units may still run
    }
  }
  return { failedCount, halted: false };
}

/** Terminal action of one unit after its attempt loop. */
type UnitAction = "done" | "delivered" | "abandoned" | "halted";

/** Gate outcome for one unit: its record plus the terminal action. */
interface UnitGateOutcome {
  record: UnitRecord;
  action: UnitAction;
}

/**
 * Drive one unit to completion: each attempt is a fresh instance, and an
 * unflipped worktree marker auto-continues while ticks progress; an attempt
 * with no new ticks (rejection, block, no-op settle) reaches the operator
 * gate — retry / deliver-incomplete / abandon / halt. There is deliberately
 * no per-unit skip inside a venue: it would strand the merge completeness
 * check with half a component.
 *
 * @param wtUnitPath Absolute path to the worktree copy of the unit file.
 * @param wtSetDir Absolute path to the worktree copy of the set folder.
 * @param slug The target worktree slug.
 * @param unit The plan unit (main-tree file, for the record).
 * @param options Run options (set folder, model, mode).
 * @param relay The shared terminal relay.
 * @param setName Set folder basename, for session names.
 * @returns The unit record and its terminal action.
 */
async function runUnitWithGate(
  wtUnitPath: string,
  wtSetDir: string,
  slug: string,
  unit: PlanUnit,
  options: RunSetOptions,
  relay: TerminalRelay,
  setName: string,
): Promise<UnitGateOutcome> {
  for (let attempt = 1; ; attempt++) {
    const suffix = attempt === 1 ? "" : ` (pass ${attempt})`;
    const sessionName = `plans: ${setName}/${unit.name}${suffix}`;
    logger.info(`\n── ${unit.name} · venue ${slug} · session ${sessionName} ──`);
    console.log('  (type to steer the worker · ".stop" aborts it)\n');
    const ticksBefore = worktreeTicks(wtUnitPath);
    const report = await driveAgent({
      sessionName,
      prompt: buildUnitPrompt(wtUnitPath, wtSetDir, slug, attempt > 1),
      model: options.model,
      relay,
      onUiRequest: dialogHook(relay),
    });
    console.log(`\n── worker report (${unit.name}) ──\n${report}\n`);
    if (worktreeTicked(wtUnitPath)) {
      return {
        record: { unit, status: "done", detail: `attempt ${attempt} (worktree ${slug})`, session: sessionName },
        action: "done",
      };
    }
    const ticksAfter = worktreeTicks(wtUnitPath);
    if (ticksAfter > ticksBefore) {
      logger.info(
        `progress: ${ticksAfter - ticksBefore} new tick(s) in the worktree copy, marker still unflipped — continuing with a fresh instance (Ctrl-C stops)`,
      );
      continue;
    }
    const gate = await askGate(relay, unit.name);
    if (gate === "retry") {
      continue;
    }
    if (gate === "deliver") {
      return {
        record: {
          unit,
          status: "failed",
          detail: `gate: delivered incomplete after ${attempt} attempt(s) — for plan rework (worktree ${slug} stands)`,
          session: sessionName,
        },
        action: "delivered",
      };
    }
    if (gate === "abandon") {
      const cleaned = await worktreeScript(["clean", slug]);
      logger.info(cleaned === null ? `abandon: clean failed — worktree ${slug} still stands` : `abandon: ${cleaned.trimEnd()}`);
      return {
        record: {
          unit,
          status: "failed",
          detail: `gate: abandoned after ${attempt} attempt(s) (worktree ${slug} cleaned)`,
          session: sessionName,
        },
        action: "abandoned",
      };
    }
    return {
      record: { unit, status: "failed", detail: `gate: halted after ${attempt} attempt(s)`, session: sessionName },
      action: "halted",
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
async function askGate(relay: TerminalRelay, unitName: string): Promise<"retry" | "deliver" | "abandon" | "halt"> {
  for (;;) {
    const line = (
      await relay.askOrchestrator(`${unitName}: top marker not flipped — retry / deliver-incomplete / abandon / halt?`)
    )
      .trim()
      .toLowerCase();
    if (line === "r" || line === "retry") {
      return "retry";
    }
    if (line === "d" || line === "deliver" || line === "deliver-incomplete") {
      return "deliver";
    }
    if (line === "a" || line === "abandon") {
      return "abandon";
    }
    if (line === "h" || line === "halt") {
      return "halt";
    }
    console.log(
      "  (r=retry, fresh instance re-entering the worktree · d=deliver incomplete for plan rework · a=abandon: clean the worktree · h=halt the run)",
    );
  }
}

/**
 * The merge checkpoint after a completed component: the single human decision
 * on landing the work. Single mode fires once at set completion (merge now /
 * halt); split mode fires after each component (merge now / continue to the
 * next component / halt; `continue` is not offered on the last component —
 * there is nothing to continue to).
 *
 * @param relay The shared terminal relay.
 * @param venue The completed venue.
 * @param mode Worktree mode.
 * @param isLastVenue True when no component follows.
 * @returns The chosen operator action.
 */
async function askCheckpoint(
  relay: TerminalRelay,
  venue: Venue,
  mode: WorktreeMode,
  isLastVenue: boolean,
): Promise<"merge" | "continue" | "halt"> {
  const status = await worktreeScript(["status", venue.slug]);
  if (status !== null) {
    console.log(status.trimEnd());
  }
  const offerContinue = mode === "split" && !isLastVenue;
  const prompt = offerContinue
    ? `component ${venue.slug} complete — merge now / continue to next component / halt?`
    : `component ${venue.slug} complete — merge now / halt?`;
  for (;;) {
    const line = (await relay.askOrchestrator(prompt)).trim().toLowerCase();
    if (line === "m" || line === "merge") {
      return "merge";
    }
    if (offerContinue && (line === "c" || line === "continue")) {
      return "continue";
    }
    if (line === "h" || line === "halt") {
      return "halt";
    }
    console.log(
      offerContinue
        ? "  (m=merge now: spawns the merge instance · c=continue to the next component, worktree stays outstanding · h=halt the run)"
        : "  (m=merge now: spawns the merge instance · h=halt the run)",
    );
  }
}

/**
 * Spawn the `/skill:merge` instance for a completed set component.
 *
 * The merge skill owns apply and cleanup; this runner only relays its dialogs
 * — never `diff`/`apply` (the single human checkpoint stays human).
 *
 * @param setDir Absolute path to the plan-set folder (main tree).
 * @param setName Set folder basename, for the session name.
 * @param relay The shared terminal relay.
 * @param model Optional model pattern passed to `pi -m`.
 * @returns The merge instance's final report.
 */
async function runMergeInstance(
  setDir: string,
  setName: string,
  relay: TerminalRelay,
  model?: string,
): Promise<string> {
  const sessionName = `plans: merge ${setName}`;
  const prompt = [
    `/skill:merge Merge the outstanding component worktrees of the plan set at ${setDir} (main repo: ${projectRoot}).`,
    "ask_user_question dialogs are relayed to a human operator at the terminal; everything lands uncommitted for review.",
  ].join("\n");
  logger.info(`\n── merge · session ${sessionName} ──\n`);
  const report = await driveAgent({ sessionName, prompt, model, relay, onUiRequest: dialogHook(relay) });
  console.log(`\n── merge report (${setName}) ──\n${report}\n`);
  return report;
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
