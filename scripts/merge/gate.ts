import { sep } from "node:path";
import { execCommandInherited, logger } from "../utils/index.js";
import { dialogHook, driveAgent } from "../agent/driver.js";
import type { TerminalRelay } from "../agent/relay.js";

/** Options for the union gate: the fix instance's model pattern. */
export interface GateOptions {
  model?: string;
}

/**
 * Derive the union-gate commands from the set folder path.
 *
 * `plans/<pkg>/...` gates through the package coverage run;
 * `plans/plugins/<p>/...` hits the plugin exception (§Testing): a dom bundle
 * refresh first (`tests/parity.test.ts` imports the `@hellajs/dom` dist
 * bundle, which a merge's cherry-pick does not rebuild), then scoped tests
 * and the repo-wide lint.
 *
 * @param relSetDir Repo-relative set-folder path.
 * @returns Commands to run, in order; the first failure is the verdict.
 */
function gateCommands(relSetDir: string): string[][] {
  const segments = relSetDir.split(sep);
  const scope = segments[1] ?? "";
  if (scope === "") {
    throw new Error(`cannot derive a union gate for ${relSetDir} (expected plans/<pkg>/... or plans/plugins/<p>/...)`);
  }
  if (scope === "plugins") {
    const plugin = segments[2] ?? "";
    if (plugin === "") {
      throw new Error(`cannot derive a plugin union gate for ${relSetDir} (expected plans/plugins/<p>/...)`);
    }
    return [
      // Stale-dist guard: the merge's cherry-pick lands dom lib changes without
      // rebuilding the gitignored dist that parity.test.ts imports (§Testing)
      ["bun", "bundle", "dom", "--quiet"],
      ["bun", "test", `plugins/${plugin}/tests`],
      ["bun", "lint"],
    ];
  }
  return [["bun", "coverage", scope]];
}

/**
 * Run the gate commands (terminal passthrough — the operator sees the gate
 * live), returning the first failing command.
 *
 * @param commands Commands to run, in order.
 * @returns null when every command exited 0, else the failing command line.
 */
async function runGateCommands(commands: string[][]): Promise<string | null> {
  for (const command of commands) {
    try {
      await execCommandInherited(command[0] ?? "", command.slice(1));
    } catch {
      return command.join(" ");
    }
  }
  return null;
}

/**
 * Build the union-gate fix prompt for a fresh instance.
 *
 * Re-enters the merge skill for its plan-contract union guidance: the
 * components were each verified green in isolation; a red merged union is the
 * unions the skill describes, fixed inside the affected component's contract
 * and commit.
 *
 * @param relSetDir Repo-relative set-folder path.
 * @param failedCommand The gate command that exited non-zero.
 * @returns The prompt text.
 */
function buildFixPrompt(relSetDir: string, failedCommand: string): string {
  return [
    `/skill:merge The merged union of plan set ${relSetDir} fails its orchestrator-run gate: \`${failedCommand}\` exited non-zero (the operator saw the output live — re-run the command to see the failure).`,
    "Identify the affected merged component (the skill's plan-contract union guidance names the usual suspects), fix the failure WITHIN that component's plan contract, and keep the fix inside that component's commit (amend it).",
    "Do not start unrelated work. ask_user_question dialogs are relayed to a human operator at the terminal.",
  ].join("\n");
}

/**
 * The fix-gate operator prompt: another fix round or halt with the union red.
 *
 * @param relay The shared terminal relay.
 * @returns The chosen operator action.
 */
async function askFixGate(relay: TerminalRelay): Promise<"retry" | "halt"> {
  for (;;) {
    const line = (await relay.askOrchestrator("union gate still RED after fix — retry-fix / halt?")).trim().toLowerCase();
    if (line === "r" || line === "retry" || line === "retry-fix") {
      return "retry";
    }
    if (line === "h" || line === "halt") {
      return "halt";
    }
    console.log("  (r=retry-fix, fresh fix instance · h=halt the run, union stays red)");
  }
}

/**
 * Verify the merged union: the components were each green in isolation; the
 * union was not. Red spawns one fix instance (plan-contract union guidance),
 * then re-runs the gate; still red reaches the operator gate.
 *
 * @param options Gate options (fix-instance model pattern).
 * @param relay The shared terminal relay.
 * @param setName Set folder basename, for session names.
 * @param relSetDir Repo-relative set-folder path.
 * @returns True when the gate ended green.
 */
export async function unionGate(
  options: GateOptions,
  relay: TerminalRelay,
  setName: string,
  relSetDir: string,
): Promise<boolean> {
  const commands = gateCommands(relSetDir);
  logger.info(`union gate: ${commands.map((command: string[]): string => command.join(" ")).join(" && ")}`);
  let failed = await runGateCommands(commands);
  if (failed === null) {
    logger.success("union gate green — merged union verified");
    return true;
  }
  for (let round = 1; ; round++) {
    const sessionName = `merge: ${setName}/union-fix (pass ${round})`;
    logger.warn(`union gate RED on \`${failed}\` — fix instance ${sessionName}`);
    const report = await driveAgent({
      sessionName,
      prompt: buildFixPrompt(relSetDir, failed),
      model: options.model,
      relay,
      onUiRequest: dialogHook(relay),
    });
    console.log(`\n── fix report (${setName}) ──\n${report}\n`);
    const recheck = await runGateCommands(commands);
    if (recheck === null) {
      logger.success("union gate green after fix");
      return true;
    }
    failed = recheck;
    if ((await askFixGate(relay)) === "retry") {
      continue;
    }
    return false;
  }
}
