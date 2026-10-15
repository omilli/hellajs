import { relative } from "node:path";
import { logger, projectRoot } from "../utils/index.js";
import { dialogHook, driveAgent, installSigint, makeRelay } from "../agent/driver.js";
import type { Relay } from "../agent/relay.js";
import { classifyOutcome, deriveQueue, idValue, snapshotEntry } from "./queue.js";
import type { MemoryEntry } from "./queue.js";

/** Default model pattern for verification instances (`--model` overrides). */
const DEFAULT_MEMORY_MODEL = "glm-5.3-flash";

/** Default thinking level for verification instances (`--thinking` overrides). */
const DEFAULT_MEMORY_THINKING = "max";

/** Default entries per run (`--limit` overrides; `--limit=0` = no cap). */
const DEFAULT_MEMORY_LIMIT = 10;

/** Options for one full memory verification run. */
export interface RunMemoryOptions {
  /** Skip entries with a lower numeric ID (`--start-id`). */
  startId?: number;
  /** Entries per run; default 10, 0 = no cap. */
  limit?: number;
  model?: string;
  thinking?: string;
  dryRun: boolean;
}

/** Terminal status of one entry. */
type EntryStatus = "verified" | "removed" | "skipped";

/** Per-entry record for the final summary. */
interface EntryRecord {
  stem: string;
  status: EntryStatus;
  detail: string;
  session: string;
}

/**
 * Build the per-entry verification prompt.
 *
 * The `/skill:memory` prefix expands to the full SKILL.md inline; the prompt
 * scopes it to the Step 5 refresh flow for this one entry. The instance runs
 * AFK: it decides autonomously (never `ask_user_question` — no operator)
 * and owns every KB write (confirm, delete, author) via the `memory.ts`
 * commands — the runner never writes KB content and only reads the
 * before/after file state.
 *
 * @param entry The entry under verification.
 * @returns The prompt text.
 */
function buildVerifyPrompt(entry: MemoryEntry): string {
  return [
    `/skill:memory Verify one knowledge-base entry against the current source tree — the skill's Step 5 refresh flow, scoped to this single entry.`,
    `Entry: ${entry.file} (ID ${entry.id})`,
    "Do not verify, write, or refresh any other entry you happen to read. Do not act on code-level implications of a false claim: record the corrected fact; code changes are a separate decision.",
    "You are running unattended (AFK): decide autonomously — never call ask_user_question; there is no operator to answer.",
    "Re-verify every factual claim against the current source, tests, and docs — open the files the entry cites or names. Then take exactly one action:",
    `- Still accurate (including concept-preserving drift — stale line refs, renamed symbols, thin citations): edit the drifted evidence in place, then run \`bun .agents/skills/memory/memory.ts confirm ${entry.id}\` (rewrites \`confirmed\` to today; everything else preserved).`,
    `- False or reversed (the old claim itself is wrong, or the decision/ritual it records is undone): delete the entry file; when the corrected fact is worth keeping, run \`bun .agents/skills/memory/memory.ts add "<imperative title>"\` and fill the created file per the skill's Step 3 — self-contained: no references to the deleted entry, no \`plans/\` paths.`,
    "- Cannot verify (the entry's subject is gone, or the evidence is ambiguous): write nothing and state exactly what blocked you.",
    "If you would hand back or are blocked, stop and report exactly that.",
  ].join("\n");
}

/**
 * Drive one entry to a terminal outcome, unattended: each attempt is a
 * fresh instance; any file-state change (content edit or deletion) ends it.
 * Unchanged after attempt 1 → exactly one retry; unchanged after attempt 2
 * → record `skipped` and continue.
 *
 * @param entry The entry under verification.
 * @param options Run options (model, thinking).
 * @param relay The shared terminal relay.
 * @param records Accumulator for the final summary.
 */
async function runEntry(
  entry: MemoryEntry,
  options: RunMemoryOptions,
  relay: Relay,
  records: EntryRecord[],
): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt++) {
    const suffix = attempt === 1 ? "" : " (retry)";
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
    if (outcome.kind === "changed") {
      const detail = `file state changed (attempt ${attempt})`;
      records.push({ stem: entry.stem, status: "verified", detail, session: sessionName });
      logger.success(`${entry.stem}: verified (${detail})`);
      return;
    }
    if (outcome.kind === "removed") {
      const detail = `entry deleted (attempt ${attempt})`;
      records.push({ stem: entry.stem, status: "removed", detail, session: sessionName });
      logger.success(`${entry.stem}: removed (${detail})`);
      return;
    }
    logger.warn(`${entry.stem}: no file-state change — attempt ${attempt} of 2`);
  }
  const detail = "unchanged after 2 attempts";
  records.push({ stem: entry.stem, status: "skipped", detail, session: `memory: ${entry.stem} (retry)` });
  logger.warn(`${entry.stem}: skipped (${detail})`);
}

/**
 * Print the per-entry summary.
 *
 * @param records Per-entry records.
 */
function printSummary(records: EntryRecord[]): void {
  logger.info("── summary ──");
  for (const record of records) {
    logger.info(`  ${record.stem}  ${record.status}  (${record.detail}) · ${record.session}`);
  }
}

/**
 * The next chunk start when the cap may leave entries unchecked: one past
 * the last queued entry's ID. Null when the run is uncapped or the queue
 * fell short of the cap (nothing known remains).
 *
 * @param queue The queued entries in execution order.
 * @param limit The effective cap (0 = no cap).
 * @returns The next `--start-id` value, or null when the sweep is complete.
 */
function nextStartId(queue: MemoryEntry[], limit: number): number | null {
  if (limit === 0 || queue.length < limit) {
    return null;
  }
  const last = queue[queue.length - 1];
  return last === undefined ? null : idValue(last.id) + 1;
}

/**
 * Run the verification pipeline over the KB: derive the queue (every entry
 * in the flat KB in ID order, floored by `startId`, capped by `limit` —
 * default 10), then drive one fresh pi instance per entry, each verifying
 * the entry against the current source tree and taking the memory skill's
 * Step 5 action.
 *
 * The runner never verifies and never writes KB content — instances do; its
 * only signal is the entry file's before/after state. An unchanged entry
 * gets exactly one retry, then is recorded skipped — the runner never
 * prompts (AFK-safe). `--dry-run` prints the queue without spawning. Exit
 * code is 0 only when no attempted entry was skipped.
 *
 * @param options Start floor, cap, model, thinking level, dry-run flag.
 * @returns Process exit code.
 */
export async function runMemory(options: RunMemoryOptions): Promise<number> {
  options.model ??= DEFAULT_MEMORY_MODEL;
  options.thinking ??= DEFAULT_MEMORY_THINKING;
  options.limit ??= DEFAULT_MEMORY_LIMIT;
  const queue = deriveQueue({ startId: options.startId, limit: options.limit });
  if (queue.length === 0) {
    logger.info(
      options.startId === undefined
        ? "no active entries — nothing to verify"
        : `no active entries with ID >= ${options.startId} — nothing to verify`,
    );
    return 0;
  }
  if (options.dryRun) {
    logger.info(`memory · dry run · ${queue.length} entry(s), no instances spawned`);
    logger.info("  actions: still true → confirm date bump (+ in-place drift fix) · false/reversed → delete the entry, author the corrected fact fresh · blocked/no-verdict → one retry, then auto-skip");
    for (const entry of queue) {
      logger.info(`  ${entry.id}  confirmed=${entry.confirmed}  ${relative(projectRoot, entry.file)}`);
    }
    const resume = nextStartId(queue, options.limit);
    if (resume !== null) {
      logger.info(`  next chunk: --start-id=${resume}`);
    }
    return 0;
  }
  const relay = makeRelay();
  relay.start();
  installSigint();
  logger.info(
    `memory · ${queue.length} entry(s), ID order from ${queue[0]?.id} · fresh instance per entry (Ctrl-C aborts the current one)`,
  );
  const records: EntryRecord[] = [];
  for (const entry of queue) {
    await runEntry(entry, options, relay, records);
  }
  printSummary(records);
  const resume = nextStartId(queue, options.limit);
  if (resume !== null) {
    logger.info(`next chunk: bun memory --start-id=${resume}`);
  }
  return records.every((record: EntryRecord): boolean => record.status !== "skipped") ? 0 : 1;
}
