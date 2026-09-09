import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { logger, projectRoot } from "../utils/index.js";
import { dialogHook, driveAgent, installSigint, makeRelay } from "../agent/driver.js";
import type { TerminalRelay } from "../agent/relay.js";
import { listPlanUnits } from "../plans/set.js";

/** One audit section key; also the plan-set suffix and the prompt's skill suffix. */
export type AuditSection = "code" | "tests" | "docs";

/** One derived section: its key, enforcing skill, and target list. */
interface SectionPlan {
  key: AuditSection;
  skill: string;
  targets: string[];
}

/** A derived section paired with its pre-computed findings set dir. */
interface SectionJob extends SectionPlan {
  setDir: string;
}

/** Options for one full audits run. */
export interface RunAuditsOptions {
  packageName: string;
  section?: AuditSection;
  model?: string;
  dryRun: boolean;
}

/** Terminal status of one section. */
type SectionStatus = "findings" | "clean" | "skipped" | "failed";

/** Per-section record for the final summary. */
interface SectionRecord {
  section: AuditSection;
  status: SectionStatus;
  detail: string;
  setRel: string | null;
  session: string | null;
}

/** Operator gate choices for a section that produced neither findings nor a clean statement. */
type GateChoice = "retry" | "clean" | "skip" | "halt";

/**
 * Derive the three sections of a package with their enforcing skills and targets.
 *
 * docs carries the package AGENTS.md because file-map drift is audit-docs
 * territory (package agent files are md files); scripts have their own skill
 * and are never part of a package run.
 *
 * @param packageName Bare workspace name.
 * @returns Section plans in fixed code → tests → docs order.
 */
function deriveSections(packageName: string): SectionPlan[] {
  const pkgRoot = `packages/${packageName}`;
  return [
    { key: "code", skill: "audit-code", targets: [`${pkgRoot}/lib/`, `${pkgRoot}/tsconfig.json`] },
    { key: "tests", skill: "audit-tests", targets: [`${pkgRoot}/tests/`] },
    {
      key: "docs",
      skill: "audit-docs",
      targets: [
        `${pkgRoot}/docs/`,
        `${pkgRoot}/README.md`,
        `${pkgRoot}/${packageName}-comparison.md`,
        `${pkgRoot}/AGENTS.md (file-map drift)`,
      ],
    },
  ];
}

/**
 * Format a yyyymmdd-HHMM local timestamp for set-dir naming.
 *
 * @returns The zero-padded stamp.
 */
function timestamp(): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

/**
 * Compute the findings set dir for one section, colliding-suffixed.
 *
 * `plans/<pkg>/audit/<stamp>-<section>/`, with `-2`, `-3`, … appended when the
 * stamped dir already exists (re-runs inside the same minute never overwrite).
 *
 * @param packageName Bare workspace name.
 * @param key Section key.
 * @returns Absolute, non-existent set dir path.
 */
function computeSetDir(packageName: string, key: AuditSection): string {
  const base = join(projectRoot, "plans", packageName, "audit", `${timestamp()}-${key}`);
  if (!existsSync(base)) {
    return base;
  }
  for (let suffix = 2; ; suffix++) {
    const candidate = `${base}-${suffix}`;
    if (!existsSync(candidate)) {
      return candidate;
    }
  }
}

/**
 * Check whether a set dir holds at least one plan unit.
 *
 * Delegates the `NN-*.md` unit pattern to the plans runner's listing (same
 * import precedent as `merge/queue.ts`): the instance authors plan files,
 * and their presence is the runner's findings-captured signal.
 *
 * @param setDir Absolute set dir path (may not exist).
 * @returns True when the dir exists with at least one `NN-*.md` unit.
 */
function hasFindings(setDir: string): boolean {
  return existsSync(setDir) && listPlanUnits(setDir).length > 0;
}

/**
 * Build the per-section audit prompt.
 *
 * The `/skill:audit-<section>` prefix expands to the full SKILL.md inline, so
 * the spawned instance audits by construction and hands actionable findings
 * to the plan skill, writing into the named set dir. Clean sections write
 * nothing — the operator gate is the runner's backstop for a silent stall.
 *
 * @param plan The section plan.
 * @param packageName Bare workspace name.
 * @param setDir Absolute findings set dir for this section.
 * @returns The prompt text.
 */
function buildSectionPrompt(plan: SectionPlan, packageName: string, setDir: string): string {
  return [
    `/skill:${plan.skill} Audit the ${plan.key} surface of packages/${packageName}: ${plan.targets.join(", ")}.`,
    "Report findings per the skill. Then, for actionable findings ONLY, apply the plan skill and write the plan set into",
    `${setDir} (create the folder; NN-*.md units + index.md per its Phase 6).`,
    "A clean section (no actionable findings) writes no files — state clean and stop.",
    "Do not fix anything: audit + plan authoring only.",
    "ask_user_question dialogs are relayed to a human operator at the terminal: use the tool for any load-bearing fork.",
    "If you would hand back to plan or are blocked, stop and report exactly that.",
  ].join("\n");
}

/**
 * The operator gate: a section produced neither a findings set nor a clean
 * statement — ask what to do.
 *
 * @param relay The shared terminal relay.
 * @param key Section key, for the prompt text.
 * @returns The chosen operator action.
 */
async function askGate(relay: TerminalRelay, key: AuditSection): Promise<GateChoice> {
  for (;;) {
    const line = (
      await relay.askOrchestrator(`${key}: no findings set and no clean statement — retry / clean / skip / halt?`)
    )
      .trim()
      .toLowerCase();
    if (line === "r" || line === "retry") {
      return "retry";
    }
    if (line === "c" || line === "clean" || line === "accept-clean") {
      return "clean";
    }
    if (line === "s" || line === "skip") {
      return "skip";
    }
    if (line === "h" || line === "halt") {
      return "halt";
    }
    console.log(
      "  (r=retry, fresh instance · c=accept as clean per the report · s=skip this section, marks the run failed · h=halt the run)",
    );
  }
}

/**
 * Drive one section to a terminal outcome: each attempt is a fresh instance;
 * a findings set ends it, anything else reaches the operator gate.
 *
 * @param job The section job (plan + set dir).
 * @param options Run options (model).
 * @param relay The shared terminal relay.
 * @param records Accumulator for the final summary.
 * @returns True when the operator halted the whole run.
 */
async function runSectionWithGate(
  job: SectionJob,
  options: RunAuditsOptions,
  relay: TerminalRelay,
  records: SectionRecord[],
): Promise<boolean> {
  for (let attempt = 1; ; attempt++) {
    const suffix = attempt === 1 ? "" : ` (pass ${attempt})`;
    const sessionName = `audits: ${options.packageName}/${job.key}${suffix}`;
    logger.info(`\n── ${job.key} · session ${sessionName} ──`);
    console.log('  (type to steer the auditor · ".stop" aborts it)\n');
    const report = await driveAgent({
      sessionName,
      prompt: buildSectionPrompt(job, options.packageName, job.setDir),
      model: options.model,
      relay,
      onUiRequest: dialogHook(relay),
    });
    console.log(`\n── audit report (${job.key}) ──\n${report}\n`);
    if (hasFindings(job.setDir)) {
      const setRel = relative(projectRoot, job.setDir);
      records.push({
        section: job.key,
        status: "findings",
        detail: `attempt ${attempt}`,
        setRel,
        session: sessionName,
      });
      logger.success(`${job.key}: findings captured — plan set at ${setRel}`);
      return false;
    }
    const gate = await askGate(relay, job.key);
    if (gate === "retry") {
      continue;
    }
    if (gate === "clean") {
      records.push({
        section: job.key,
        status: "clean",
        detail: `accepted clean after ${attempt} attempt(s)`,
        setRel: null,
        session: sessionName,
      });
      return false;
    }
    if (gate === "skip") {
      records.push({
        section: job.key,
        status: "skipped",
        detail: `gate: skipped after ${attempt} attempt(s)`,
        setRel: null,
        session: sessionName,
      });
      return false;
    }
    records.push({
      section: job.key,
      status: "failed",
      detail: `gate: halted after ${attempt} attempt(s)`,
      setRel: null,
      session: sessionName,
    });
    return true;
  }
}

/**
 * Print the per-section summary plus the executable next step per findings set.
 *
 * @param records Per-section records.
 * @param halted True when the operator halted the run.
 */
function printSummary(records: SectionRecord[], halted: boolean): void {
  logger.info("── summary ──");
  for (const record of records) {
    const session = record.session === null ? "" : ` · ${record.session}`;
    logger.info(`  ${record.section}  ${record.status}  (${record.detail})${session}`);
  }
  const sets = records.filter((record: SectionRecord): boolean => record.setRel !== null);
  if (sets.length > 0) {
    const invocations = sets.map((record: SectionRecord): string => `bun plans ${record.setRel}`).join("  ·  ");
    logger.info(`review the plan sets, then execute each with: ${invocations}`);
  }
  if (halted) {
    logger.warn("run halted by operator; remaining sections not started");
  }
}

/**
 * Run the audit pipeline for one package: derive sections, then drive one
 * fresh pi instance per section (fixed code → tests → docs order), each
 * auditing with its skill and authoring its own findings plan set under
 * `plans/<pkg>/audit/`.
 *
 * The runner never audits and never writes plan content — instances do. Its
 * only signals are the findings set's presence and the operator gate
 * (retry / accept-clean / skip / halt) when neither a set nor a clean
 * statement materialized. `--dry-run` prints the derived sections and set
 * dirs without spawning. Exit code is 0 only when every attempted section
 * ended findings-captured, clean, or accepted-clean.
 *
 * @param options Package name, optional section filter, model, dry-run flag.
 * @returns Process exit code.
 */
export async function runAudits(options: RunAuditsOptions): Promise<number> {
  const jobs: SectionJob[] = deriveSections(options.packageName)
    .filter((plan: SectionPlan): boolean => options.section === undefined || plan.key === options.section)
    .map((plan: SectionPlan): SectionJob => ({ ...plan, setDir: computeSetDir(options.packageName, plan.key) }));
  if (jobs.length === 0) {
    logger.error(`no sections derived for "${options.packageName}"`);
    return 1;
  }
  if (options.dryRun) {
    logger.info(`audits ${options.packageName} · dry run · ${jobs.length} section(s), no instances spawned`);
    for (const job of jobs) {
      logger.info(`  ${job.key} → /skill:${job.skill} · targets: ${job.targets.join(", ")}`);
      logger.info(`      findings set: ${relative(projectRoot, job.setDir)}/`);
    }
    return 0;
  }
  const relay = makeRelay();
  relay.start();
  installSigint();
  const order = jobs.map((job: SectionJob): string => job.key).join(" → ");
  logger.info(
    `audits ${options.packageName} · ${order} · fresh instance per section (Ctrl-C aborts the current one)`,
  );
  const records: SectionRecord[] = [];
  let halted = false;
  for (const job of jobs) {
    halted = await runSectionWithGate(job, options, relay, records);
    if (halted) {
      break;
    }
  }
  printSummary(records, halted);
  const complete =
    !halted && records.every((record: SectionRecord): boolean => record.status === "findings" || record.status === "clean");
  return complete ? 0 : 1;
}
