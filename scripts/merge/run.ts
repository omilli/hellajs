import { readFileSync, writeFileSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { logger, projectRoot } from "../utils/index.js";
import { dialogHook, driveAgent, installSigint, makeRelay } from "../agent/driver.js";
import type { TerminalRelay } from "../agent/relay.js";
import { worktreeScript } from "../agent/worktree.js";
import { isTicked, listPlanUnits, type PlanUnit } from "../plans/set.js";
import { unionGate } from "./gate.js";
import { allTickedInMainTree, deriveQueue, isCompleteInWorktree, mainTreeTickTotal, type QueueEntry } from "./queue.js";

/** Options for one full merge run. */
export interface MergeOptions {
  setDir: string;
  model?: string;
  dryRun: boolean;
}

/** Terminal status of one queued component. */
type ComponentStatus = "merged" | "refused" | "skipped" | "halted";

/** Per-component record for the final summary. */
interface ComponentRecord {
  slug: string;
  status: ComponentStatus;
  detail: string;
  session: string | null;
}

/** Terminal action of one component after its attempt loop. */
interface ComponentOutcome {
  record: ComponentRecord;
  status: ComponentStatus;
}

/**
 * Build the per-component merge prompt for a fresh instance.
 *
 * The `/skill:merge` prefix expands to the merge SKILL.md inline — the
 * per-component contract (checks, commit + cherry-pick + plan-contract-grounded
 * conflict resolution, plan-copy updates, memory collisions, cleanup). The
 * orchestrator boundary (queue, index flip, union gate) is restated so a
 * capable instance never grows past its component. On continuation passes the
 * prompt adds a resume note — a prior attempt may have landed partial state.
 *
 * @param entry The component to merge.
 * @param setDir Absolute path to the plan-set folder.
 * @param relSetDir Repo-relative set-folder path.
 * @param continuation True on passes after the first.
 * @returns The prompt text.
 */
function buildMergePrompt(entry: QueueEntry, setDir: string, relSetDir: string, continuation: boolean): string {
  const unitNames = entry.units.map((unit: PlanUnit): string => unit.name).join(", ");
  const lines = [
    `/skill:merge Merge the ONE component worktree "${entry.slug}" of plan set ${relSetDir} into the main tree. Set context lives in ${join(setDir, "index.md")} — read it first for shared scope.`,
    `Your component's units: ${unitNames}. Completeness ([x] in the worktree copy) was pre-checked by the orchestrator.`,
    "Execute the skill end-to-end for this component: its pre-commit checks, the commit-message derivation, worktree.mjs commit, git cherry-pick with agent-side plan-contract-grounded conflict resolution, the unstaged main-tree plan-copy updates (and index.md description lines for YOUR units only), memory-ID collision handling inside the component's commit, and the worktree cleanup.",
    "Queue derivation, the index.md top-marker flip, and the union gate (bun coverage / plugin test + lint) are orchestrator-owned — never do them. Never merge another component's worktree.",
    "ask_user_question dialogs are relayed to a human operator at the terminal: use the tool for any load-bearing fork or clarification mid-task; free-text steering may also arrive from the operator.",
    "If the merge cannot complete (deeper completeness failure, ordering violation, unresolvable conflict), stop and report exactly that — leave the worktree standing. The orchestrator treats a still-standing worktree as failure and asks the operator.",
  ];
  if (continuation) {
    lines.push(
      "A previous attempt made partial progress (main-tree plan ticks or landed commits may exist). Verify what already landed (git log, worktree.mjs status) and resume from there — never re-merge landed commits.",
    );
  }
  return lines.join("\n");
}

/**
 * Run one full plan-set merge: derive the queue mechanically, then drive one
 * fresh pi instance per outstanding component worktree.
 *
 * Per component: completeness pre-check (refused components keep their
 * worktrees standing), then the attempt loop — an instance that lands its
 * main-tree plan ticks but leaves the worktree standing auto-continues with a
 * fresh instance; no progress reaches the operator gate (retry / skip / halt).
 * Success = the worktree is cleaned AND every component unit ticks in the
 * main tree. After the last merged component the runner owns the set
 * aggregate (index.md top-marker flip) and the union gate, spawning one fix
 * instance per red round. Exit code 0 only when every queued component merged
 * and the gate ran green.
 *
 * @param options Set folder (absolute), optional model pattern, dry-run flag.
 * @returns Process exit code.
 */
export async function runMerge(options: MergeOptions): Promise<number> {
  const units = listPlanUnits(options.setDir);
  const setName = basename(options.setDir);
  const relSetDir = relative(projectRoot, options.setDir);
  const inventory = await worktreeScript(["list"]);
  if (inventory === null) {
    logger.error("merge: `worktree.mjs list` failed — cannot derive the queue");
    return 1;
  }
  const derived = deriveQueue(options.setDir, inventory);
  logger.info(
    `merge set ${setName} · ${derived.queue.length} to merge · ${derived.preMerged.length} already merged · ${derived.anomalies.length} unmatched`,
  );
  for (const entry of derived.queue) {
    const first = entry.units[0]?.name ?? "?";
    const last = entry.units[entry.units.length - 1]?.name ?? "?";
    logger.info(`  queue   ${entry.slug} · units ${first}${last === first ? "" : `…${last}`} (${entry.units.length})`);
  }
  for (const entry of derived.preMerged) {
    logger.info(`  skip    ${entry.slug} (main-tree markers [x] — already merged)`);
  }
  for (const slug of derived.anomalies) {
    logger.warn(`  anomaly ${slug} — slug matches no component of ${relSetDir}; excluded (merge it manually)`);
  }
  if (derived.queue.length === 0) {
    logger.success("merge queue empty — nothing outstanding for this set");
    return 0;
  }
  if (options.dryRun) {
    for (const entry of derived.queue) {
      const complete = isCompleteInWorktree(relSetDir, entry);
      logger.info(`  ${entry.slug} · ${complete ? "complete — would merge" : "INCOMPLETE — would be refused (left standing)"}`);
    }
    logger.info("dry run — no instance spawned, nothing merged");
    return 0;
  }
  const relay = makeRelay();
  relay.start();
  installSigint();
  const records: ComponentRecord[] = [];
  let mergedAny = false;
  for (const entry of derived.queue) {
    if (!isCompleteInWorktree(relSetDir, entry)) {
      logger.warn(`refuse ${entry.slug} — worktree copy incomplete; standing for plan rework`);
      records.push({ slug: entry.slug, status: "refused", detail: "worktree copy incomplete", session: null });
      continue;
    }
    const outcome = await mergeComponent(entry, options, relay, setName, relSetDir);
    records.push(outcome.record);
    if (outcome.status === "merged") {
      mergedAny = true;
      logger.success(`merged ${entry.slug}`);
      continue;
    }
    if (outcome.status === "halted") {
      break;
    }
    logger.warn(`${entry.slug} ${outcome.status} — standing`);
  }
  let gateGreen = true;
  if (mergedAny) {
    flipIndexMarker(options.setDir, units);
    gateGreen = await unionGate(options, relay, setName, relSetDir);
  } else {
    logger.info("no component merged — set aggregate and union gate skipped");
  }
  printSummary(records, gateGreen);
  return gateGreen && records.every((record: ComponentRecord): boolean => record.status === "merged") ? 0 : 1;
}

/**
 * Drive one component to completion: each attempt is a fresh instance; landed
 * main-tree ticks with the worktree still standing auto-continue; an attempt
 * with no progress reaches the operator gate — retry / skip / halt. There is
 * no silent per-component skip: a skipped component leaves the set
 * outstanding and the run exits non-zero.
 *
 * @param entry The component to merge.
 * @param options Run options (set folder, model).
 * @param relay The shared terminal relay.
 * @param setName Set folder basename, for session names.
 * @param relSetDir Repo-relative set-folder path.
 * @returns The component record and its terminal status.
 */
async function mergeComponent(
  entry: QueueEntry,
  options: MergeOptions,
  relay: TerminalRelay,
  setName: string,
  relSetDir: string,
): Promise<ComponentOutcome> {
  for (let attempt = 1; ; attempt++) {
    const suffix = attempt === 1 ? "" : ` (pass ${attempt})`;
    const sessionName = `merge: ${setName}/${entry.slug}${suffix}`;
    logger.info(`\n── ${entry.slug} · session ${sessionName} ──`);
    console.log('  (type to steer the agent · ".stop" aborts it)\n');
    const ticksBefore = mainTreeTickTotal(entry);
    const report = await driveAgent({
      sessionName,
      prompt: buildMergePrompt(entry, options.setDir, relSetDir, attempt > 1),
      model: options.model,
      relay,
      onUiRequest: dialogHook(relay),
    });
    console.log(`\n── merge report (${entry.slug}) ──\n${report}\n`);
    const listing = await worktreeScript(["list"]);
    const cleaned =
      listing !== null && !listing.split("\n").some((line: string): boolean => line.startsWith(`${entry.slug}  `));
    if (cleaned && allTickedInMainTree(entry)) {
      return {
        record: { slug: entry.slug, status: "merged", detail: `attempt ${attempt}`, session: sessionName },
        status: "merged",
      };
    }
    const ticksAfter = mainTreeTickTotal(entry);
    if (ticksAfter > ticksBefore) {
      logger.info(
        `progress: ${ticksAfter - ticksBefore} new main-tree tick(s), component unfinished — continuing with a fresh instance (Ctrl-C stops)`,
      );
      continue;
    }
    const gate = await askComponentGate(relay, entry.slug, cleaned);
    if (gate === "retry") {
      continue;
    }
    if (gate === "skip") {
      return {
        record: {
          slug: entry.slug,
          status: "skipped",
          detail: `gate: skipped after ${attempt} attempt(s) — worktree standing`,
          session: sessionName,
        },
        status: "skipped",
      };
    }
    return {
      record: { slug: entry.slug, status: "halted", detail: `gate: halted after ${attempt} attempt(s)`, session: sessionName },
      status: "halted",
    };
  }
}

/**
 * The component failure gate: ask the operator what to do with an unmerged
 * component.
 *
 * @param relay The shared terminal relay.
 * @param slug Component slug, for the prompt text.
 * @param cleaned Whether the worktree was cleaned anyway.
 * @returns The chosen operator action.
 */
async function askComponentGate(relay: TerminalRelay, slug: string, cleaned: boolean): Promise<"retry" | "skip" | "halt"> {
  const state = cleaned ? "worktree cleaned but main-tree ticks missing" : "worktree still standing";
  for (;;) {
    const line = (await relay.askOrchestrator(`${slug}: not merged (${state}) — retry / skip / halt?`)).trim().toLowerCase();
    if (line === "r" || line === "retry") {
      return "retry";
    }
    if (line === "s" || line === "skip") {
      return "skip";
    }
    if (line === "h" || line === "halt") {
      return "halt";
    }
    console.log("  (r=retry, fresh instance resuming the component · s=skip: leave standing, continue the queue · h=halt the run)");
  }
}

/**
 * Recompute the set aggregate (mechanical half of the old merge Step 3):
 * every sibling unit ticked in the main tree → flip `index.md`'s top marker.
 * Description-line corrections are instance-owned (each component fixes its
 * own units' lines inside its merge).
 *
 * @param setDir Absolute path to the plan-set folder.
 * @param units Every unit of the set.
 */
function flipIndexMarker(setDir: string, units: PlanUnit[]): void {
  const indexPath = join(setDir, "index.md");
  let text: string;
  try {
    text = readFileSync(indexPath, "utf8");
  } catch {
    logger.warn("set aggregate: no index.md — nothing to flip");
    return;
  }
  if (!units.every((unit: PlanUnit): boolean => isTicked(unit.path))) {
    logger.info("set aggregate: units outstanding — index.md top marker stays [ ]");
    return;
  }
  const flipped = text.replace(/^#\s*\[ \]/m, "# [x]");
  if (flipped === text) {
    logger.info("set aggregate: index.md top marker already [x]");
    return;
  }
  writeFileSync(indexPath, flipped);
  logger.success("set aggregate: index.md top marker flipped [ ] → [x]");
}

/** Print the per-component summary with session names for audit. */
function printSummary(records: ComponentRecord[], gateGreen: boolean): void {
  logger.info("── summary ──");
  for (const record of records) {
    const session = record.session === null ? "" : ` · ${record.session}`;
    logger.info(`  ${record.slug}  ${record.status}  (${record.detail})${session}`);
  }
  if (!gateGreen) {
    logger.warn("union gate RED — the merged union is unverified; fix before relying on it");
  }
}
