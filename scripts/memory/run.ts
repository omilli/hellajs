import { relative } from "node:path";
import { logger, projectRoot } from "../utils/index.js";
import { dialogHook, driveAgent, installSigint, makeRelay } from "../agent/driver.js";
import type { Relay } from "../agent/relay.js";
import { classifyOutcome, deriveQueue, snapshotEntry } from "./queue.js";
import type { EntryOutcome, MemoryEntry } from "./queue.js";

/** Default staleness cutoff in days (`memory.ts stale` parity). */
export const DEFAULT_STALE_DAYS = 180;

/** Default model pattern for verification instances (`--model` overrides). */
const DEFAULT_MEMORY_MODEL = "glm-5.3-flash";

/** Default thinking level for verification instances (`--thinking` overrides). */
const DEFAULT_MEMORY_THINKING = "max";

/** Options for one full memory verification run. */
export interface RunMemoryOptions {
  all: boolean;
  days: number;
  limit?: number;
  model?: string;
  thinking?: string;
  dryRun: boolean;
}

/** Terminal status of one entry. */
type EntryStatus = "verified" | "superseded" | "accepted" | "skipped" | "failed";

/** Per-entry record for the final summary. */
interface EntryRecord {
  stem: string;
  status: EntryStatus;
  detail: string;
  session: string;
}

/** Operator gate choices for an entry whose instance left no outcome signal. */
type GateChoice = "retry" | "accept" | "skip" | "halt";

/**
 * Build the per-entry verification prompt.
 *
 * The `/skill:memory` prefix expands to the full SKILL.md inline; the prompt
 * scopes it to the Step 5 refresh flow for this one entry. The instance owns
 * every KB write (bump, author, supersede) via the `memory.ts` commands —
 * the runner never writes KB content and only reads the before/after file
 * state.
 *
 * @param entry The entry under verification.
 * @returns The prompt text.
 */
function buildVerifyPrompt(entry: MemoryEntry): string {
  return [
    `/skill:memory Verify one knowledge-base entry against the current source tree — the skill's Step 5 refresh flow, scoped to this single entry.`,
    `Entry: ${entry.file}`,
    "Do not verify, write, or refresh any other entry you happen to read. Do not act on code-level implications of a false claim: record the corrected fact; code changes are a separate decision.",
    "Re-verify every factual claim against the current source, tests, and docs — open the files the entry cites or names. Then take exactly one action:",
    '- Still accurate: bump `last_confirmed` in the entry frontmatter to today (bump `timestamp` too only if you also edit the body), run `bun .agents/skills/memory/memory.ts rebuild`, and log the refresh via `bun .agents/skills/memory/memory.ts log "<what you re-verified>" --label Refresh`.',
    "- False or misleading: author the corrected concept (`bun .agents/skills/memory/memory.ts add`, `--fix` for a correction type; fill in frontmatter + body per the skill's Step 3), then `bun .agents/skills/memory/memory.ts supersede <old-id> <new-id>`.",
    "- Cannot verify (the entry's subject is gone, the evidence is ambiguous, or retiring it is a load-bearing fork): write nothing and state exactly what blocked you.",
    "ask_user_question dialogs are relayed to a human operator at the terminal: use the tool for any load-bearing fork.",
    "If you would hand back or are blocked, stop and report exactly that.",
  ].join("\n");
}

/**
 * The operator gate: an instance left the entry unchanged (or removed it
 * outside supersession) — ask what to do.
 *
 * @param relay The shared terminal relay.
 * @param stem Entry stem, for the prompt text.
 * @returns The chosen operator action.
 */
async function askGate(relay: Relay, stem: string): Promise<GateChoice> {
  for (;;) {
    const line = (
      await relay.askOrchestrator(`${stem}: no verification action landed — retry / accept / skip / halt?`)
    )
      .trim()
      .toLowerCase();
    if (line === "r" || line === "retry") {
      return "retry";
    }
    if (line === "a" || line === "accept") {
      return "accept";
    }
    if (line === "s" || line === "skip") {
      return "skip";
    }
    if (line === "h" || line === "halt") {
      return "halt";
    }
    console.log(
      "  (r=retry, fresh instance · a=accept the report as-is, no write needed · s=skip this entry, marks the run failed · h=halt the run)",
    );
  }
}

/**
 * Map a classified outcome to the record it lands in the summary as; null
 * when the outcome carries no signal and the operator gate must decide.
 *
 * @param outcome The classified before/after outcome.
 * @param entry The entry under verification.
 * @returns The record, or null for the gate.
 */
function outcomeRecord(outcome: EntryOutcome, entry: MemoryEntry): { status: EntryStatus; detail: string } | null {
  if (outcome.kind === "refreshed") {
    return { status: "verified", detail: "dates bumped or entry refreshed" };
  }
  if (outcome.kind === "superseded") {
    return {
      status: "superseded",
      detail: outcome.successor === null ? `${entry.id} archived, no successor named` : `${entry.id} → ${outcome.successor}`,
    };
  }
  return null;
}

/**
 * Drive one entry to a terminal outcome: each attempt is a fresh instance;
 * a file-state change ends it, anything else reaches the operator gate.
 *
 * @param entry The entry under verification.
 * @param options Run options (model, thinking).
 * @param relay The shared terminal relay.
 * @param records Accumulator for the final summary.
 * @returns True when the operator halted the whole run.
 */
async function runEntryWithGate(
  entry: MemoryEntry,
  options: RunMemoryOptions,
  relay: Relay,
  records: EntryRecord[],
): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    const suffix = attempt === 1 ? "" : ` (pass ${attempt})`;
    const sessionName = `memory: ${entry.stem}${suffix}`;
    logger.info(`\n── ${entry.stem} · session ${sessionName} ──`);
    console.log('  (type to steer the verifier · ".stop" aborts it)\n');
    const before = snapshotEntry(entry.file);
    const report = await driveAgent({
      sessionName,
      prompt: buildVerifyPrompt(entry),
      model: options.model,
      thinking: options.thinking,
      relay,
      onUiRequest: dialogHook(relay),
    });
    console.log(`\n── verify report (${entry.stem}) ──\n${report}\n`);
    const outcome = classifyOutcome(entry.file, before);
    const record = outcomeRecord(outcome, entry);
    if (record !== null) {
      records.push({ stem: entry.stem, status: record.status, detail: record.detail, session: sessionName });
      logger.success(`${entry.stem}: ${record.status} (${record.detail})`);
      return false;
    }
    if (outcome.kind === "removed") {
      logger.warn(`${entry.stem}: entry vanished without supersession — treating as no signal`);
    }
    const gate = await askGate(relay, entry.stem);
    if (gate === "retry") {
      continue;
    }
    if (gate === "accept") {
      records.push({
        stem: entry.stem,
        status: "accepted",
        detail: `accepted after ${attempt} attempt(s)`,
        session: sessionName,
      });
      return false;
    }
    if (gate === "skip") {
      records.push({
        stem: entry.stem,
        status: "skipped",
        detail: `gate: skipped after ${attempt} attempt(s)`,
        session: sessionName,
      });
      return false;
    }
    records.push({
      stem: entry.stem,
      status: "failed",
      detail: `gate: halted after ${attempt} attempt(s)`,
      session: sessionName,
    });
    return true;
  }
}

/**
 * Print the per-entry summary plus the supersession pairs for log review.
 *
 * @param records Per-entry records.
 * @param halted True when the operator halted the run.
 */
function printSummary(records: EntryRecord[], halted: boolean): void {
  logger.info("── summary ──");
  for (const record of records) {
    logger.info(`  ${record.stem}  ${record.status}  (${record.detail}) · ${record.session}`);
  }
  if (halted) {
    logger.warn("run halted by operator; remaining entries not started");
  }
}

/**
 * Run the verification pipeline over the KB: derive the queue (stale-only
 * by default, oldest first), then drive one fresh pi instance per entry,
 * each verifying the entry against the current source tree and taking the
 * memory skill's Step 5 action.
 *
 * The runner never verifies and never writes KB content — instances do. Its
 * only signals are the entry file's before/after state and the operator
 * gate (retry / accept / skip / halt) when no action landed. `--dry-run`
 * prints the queue without spawning. Exit code is 0 only when every
 * attempted entry ended verified, superseded, or accepted.
 *
 * @param options Queue options, model, thinking level, dry-run flag.
 * @returns Process exit code.
 */
export async function runMemory(options: RunMemoryOptions): Promise<number> {
  options.model ??= DEFAULT_MEMORY_MODEL;
  options.thinking ??= DEFAULT_MEMORY_THINKING;
  const queue = deriveQueue({ all: options.all, days: options.days, limit: options.limit });
  if (queue.length === 0) {
    logger.info(options.all ? "no active entries — nothing to verify" : `no entries older than ${options.days} days — nothing to verify`);
    return 0;
  }
  if (options.dryRun) {
    logger.info(`memory · dry run · ${queue.length} entry(s), no instances spawned`);
    logger.info("  actions: still true → bump last_confirmed + rebuild · false → author corrected concept + supersede · blocked → operator gate");
    for (const entry of queue) {
      logger.info(`  ${entry.id}  last_confirmed=${entry.lastConfirmed}  ${relative(projectRoot, entry.file)}`);
    }
    return 0;
  }
  const relay = makeRelay();
  relay.start();
  installSigint();
  logger.info(
    `memory · ${queue.length} entry(s), oldest first · fresh instance per entry (Ctrl-C aborts the current one)`,
  );
  const records: EntryRecord[] = [];
  let halted = false;
  for (const entry of queue) {
    halted = await runEntryWithGate(entry, options, relay, records);
    if (halted) {
      break;
    }
  }
  printSummary(records, halted);
  const complete =
    !halted &&
    records.every((record: EntryRecord): boolean => record.status === "verified" || record.status === "superseded" || record.status === "accepted");
  return complete ? 0 : 1;
}
