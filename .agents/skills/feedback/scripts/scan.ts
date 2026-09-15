/**
 * Thread scanner for the feedback skill — ground-truth waste report parsed
 * from pi session JSONL (`~/.pi/agent/sessions/--<cwd>--/<ts>_<uuid>.jsonl`,
 * format per pi docs §Session File Format; entries form a tree via
 * id/parentId, so abandoned branches are excluded by walking the active
 * path — last entry to root).
 *
 * Reports, per thread: failed bash commands (isError or "Command exited
 * with code N"), exact-duplicate command invocations, oversized and
 * truncation-marked tool outputs, files read more than once, token totals
 * (input/cacheRead/cacheWrite/output, cost), stopReason error/length/aborted
 * counts, compaction events, and adjacent single-toolCall assistant pairs
 * (round-trips batching could have collapsed). Self-invocations (this
 * script's own path) are excluded from failure/repeat tallies.
 *
 * Report-only: findings never change the exit code. Exit 0 = report
 * written; 1 = no session file resolved; 2 = unreadable input.
 *
 * Usage: bun .agents/skills/feedback/scripts/scan.ts [session.jsonl] [--all]
 *   (no args)  newest session for the current working directory
 *   --all      every session file in that dir, plus cross-run recurrence
 *              (commands failing in 2+ sessions)
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const SELF = "feedback/scripts/scan";
const EXIT_CODE_RE = /Command exited with code (\d+)/;
const TRUNC_RE = /(truncated to|Output is truncated|output is truncated)/i;

interface Entry {
  type: string;
  id?: string;
  parentId?: string | null;
  timestamp?: string;
  message?: any;
}

interface Call {
  toolCallId: string;
  name: string;
  cmd: string;
}

interface Result {
  toolCallId: string;
  toolName: string;
  isError: boolean;
  text: string;
}

interface ThreadReport {
  file: string;
  span: string;
  entries: number;
  failures: { cmd: string; why: string }[];
  repeats: { n: number; cmd: string }[];
  bigResults: { label: string; kib: number; truncated: boolean }[];
  reReads: { n: number; path: string }[];
  usage: { input: number; cacheRead: number; cacheWrite: number; output: number; cost: number };
  assistantMsgs: number;
  badStops: Record<string, number>;
  compactions: number;
  pairCount: number;
  pairExamples: string[];
}

function sessionDir(): string {
  const dashed = process.cwd().replace(/^\//, "").replace(/\//g, "-");
  return join(homedir(), ".pi", "agent", "sessions", `--${dashed}--`);
}

function newestSession(dir: string): string | null {
  let best: string | null = null;
  let bestMtime = 0;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".jsonl")) continue;
    const mtime = statSync(join(dir, f)).mtimeMs;
    if (mtime > bestMtime) {
      bestMtime = mtime;
      best = join(dir, f);
    }
  }
  return best;
}

/** Active-branch entries: map id -> entry, then walk last entry to root. */
function activeEntries(path: string): Entry[] {
  const lines = readFileSync(path, "utf8").split("\n");
  const byId = new Map<string, Entry>();
  let leaf: Entry | null = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    let entry: Entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue; // torn trailing line of a live-appended file
    }
    if (!entry.id) continue; // session header
    byId.set(entry.id, entry);
    leaf = entry;
  }
  const chain: Entry[] = [];
  for (let cur: Entry | null = leaf; cur; cur = cur.parentId ? byId.get(cur.parentId) ?? null : null) {
    chain.push(cur);
  }
  return chain.reverse();
}

function analyze(path: string): ThreadReport | null {
  const entries = activeEntries(path);
  if (!entries.length) return null;

  const calls = new Map<string, Call>(); // toolCallId -> call
  const results: Result[] = [];
  const bashCmds: string[] = [];
  const readPaths: { path: string; offset?: number }[] = [];
  const usage = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0 };
  const badStops: Record<string, number> = {};
  let assistantMsgs = 0;
  let compactions = 0;
  let pairCount = 0;
  const pairExamples: string[] = [];

  // Adjacent-single-pair state: (toolCount, label) of the previous assistant
  // message, voided by a user message between the two.
  let prev: { n: number; label: string } | null = null;

  for (const entry of entries) {
    const msg = entry.message;
    if (!msg) continue;
    if (msg.role === "user") {
      prev = null;
      continue;
    }
    if (msg.role === "compactionSummary") {
      compactions++;
      continue;
    }
    if (msg.role === "bashExecution") {
      if (msg.command) bashCmds.push(msg.command);
      if (msg.output && (msg.cancelled || (msg.exitCode ?? 0) !== 0)) {
        results.push({ toolCallId: `bashExec-${entry.id}`, toolName: "bash", isError: true, text: msg.output });
        calls.set(`bashExec-${entry.id}`, {
          toolCallId: `bashExec-${entry.id}`,
          name: "bash",
          cmd: msg.command ?? "(?)",
        });
      }
      continue;
    }
    if (msg.role !== "assistant" && msg.role !== "toolResult") continue;

    if (msg.role === "toolResult") {
      const text = Array.isArray(msg.content)
        ? String(msg.content.map((b: any) => b?.text ?? "").join(""))
        : String(msg.content ?? "");
      results.push({ toolCallId: msg.toolCallId, toolName: msg.toolName, isError: !!msg.isError, text });
      continue;
    }

    // assistant
    assistantMsgs++;
    const u = msg.usage ?? {};
    usage.input += Number(u.input ?? 0);
    usage.cacheRead += Number(u.cacheRead ?? 0);
    usage.cacheWrite += Number(u.cacheWrite ?? 0);
    usage.output += Number(u.output ?? 0);
    usage.cost += Number(u.cost?.total ?? 0);
    if (msg.stopReason === "error" || msg.stopReason === "length" || msg.stopReason === "aborted") {
      badStops[msg.stopReason] = (badStops[msg.stopReason] ?? 0) + 1;
    }

    const blocks = Array.isArray(msg.content) ? msg.content : [];
    const toolCalls = blocks.filter((b: any) => b?.type === "toolCall");
    const labels: string[] = [];
    for (const tc of toolCalls) {
      const cmd = tc.name === "read" ? String(tc.arguments?.path ?? "") : String(tc.arguments?.command ?? "");
      const call: Call = { toolCallId: tc.id, name: tc.name, cmd };
      calls.set(call.toolCallId, call);
      if (tc.name === "bash" && cmd) bashCmds.push(cmd);
      if (tc.name === "read" && cmd) readPaths.push({ path: cmd, offset: tc.arguments?.offset });
      labels.push(cmd ? `${tc.name}:${cmd.slice(0, 60)}` : tc.name);
    }
    if (prev && prev.n === 1 && toolCalls.length === 1) {
      pairCount++;
      if (pairExamples.length < 5) pairExamples.push(`${prev.label} + ${labels[0] ?? "?"}`);
    }
    prev = toolCalls.length ? { n: toolCalls.length, label: labels[0] ?? "?" } : null;
  }

  // Failures: bash results with isError or an explicit non-zero exit marker.
  const failures: { cmd: string; why: string }[] = [];
  for (const r of results) {
    if (r.toolName !== "bash") continue;
    const m = r.text.match(EXIT_CODE_RE);
    const code = m ? Number(m[1]) : 0;
    if (!r.isError && code === 0) continue;
    const cmd = calls.get(r.toolCallId)?.cmd ?? "(?)";
    if (cmd.includes(SELF)) continue;
    failures.push({ cmd: cmd.slice(0, 120), why: code > 0 ? `exit ${code}` : "tool-error" });
  }

  // Repeats: exact-duplicate bash invocations, self excluded.
  const counts = new Map<string, number>();
  for (const c of bashCmds) {
    if (c.includes(SELF)) continue;
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const repeats = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([cmd, n]) => ({ n, cmd: cmd.slice(0, 120) }));

  // Context bloat: largest results (label = joined command/path), truncation-marked.
  const bigResults = results
    .map((r) => {
      const call = calls.get(r.toolCallId);
      const label = call ? (call.name === "read" ? `read ${call.cmd}` : call.cmd || r.toolName) : r.toolName;
      return { label: label.slice(0, 90), kib: r.text.length / 1024, truncated: TRUNC_RE.test(r.text.slice(0, 300)) || TRUNC_RE.test(r.text.slice(-300)) };
    })
    .sort((a, b) => b.kib - a.kib)
    .slice(0, 5);

  const readCounts = new Map<string, { total: number; plain: number }>();
  for (const p of readPaths) {
    const c = readCounts.get(p.path) ?? { total: 0, plain: 0 };
    c.total++;
    if (!p.offset) c.plain++; // offset = deliberate continuation slice, not a re-read
    readCounts.set(p.path, c);
  }
  const reReads = [...readCounts.entries()]
    .filter(([, c]) => c.plain > 1)
    .map(([path, c]) => ({ n: c.plain, path }));

  return {
    file: path,
    span: `${entries[0]?.timestamp ?? "?"} -> ${entries[entries.length - 1]?.timestamp ?? "?"}`,
    entries: entries.length,
    failures,
    repeats,
    bigResults,
    reReads,
    usage,
    assistantMsgs,
    badStops,
    compactions,
    pairCount,
    pairExamples,
  };
}

function fmt(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)}M`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)}K`;
  return String(n);
}

function printReport(r: ThreadReport): void {
  const base = r.file.split("/").pop();
  console.log(`### Thread scan — ${base}`);
  console.log(`Entries ${r.entries} | assistant msgs ${r.assistantMsgs} | tokens in ${fmt(r.usage.input)} cacheR ${fmt(r.usage.cacheRead)} cacheW ${fmt(r.usage.cacheWrite)} out ${fmt(r.usage.output)} | cost $${r.usage.cost.toFixed(2)}`);
  const stops = Object.entries(r.badStops).map(([k, v]) => `${k}×${v}`).join(" ");
  console.log(`stopReason anomalies: ${stops || "none"} | compactions: ${r.compactions}`);

  console.log(`\n**Failed commands (${r.failures.length})**`);
  if (!r.failures.length) console.log("none");
  for (const f of r.failures) console.log(`- [${f.why}] ${f.cmd}`);

  console.log(`\n**Repeated commands (${r.repeats.length})**`);
  if (!r.repeats.length) console.log("none");
  for (const p of r.repeats) console.log(`- ×${p.n} ${p.cmd}`);

  console.log(`\n**Largest outputs (KiB)**`);
  for (const b of r.bigResults) console.log(`- ${b.kib.toFixed(1)}${b.truncated ? " [truncated]" : ""} ${b.label}`);

  console.log(`\n**Files read >1x (${r.reReads.length})**`);
  if (!r.reReads.length) console.log("none");
  for (const p of r.reReads) console.log(`- ×${p.n} ${p.path}`);

  console.log(`\n**Sequential single-call pairs (${r.pairCount}) — batching review**`);
  if (!r.pairExamples.length) console.log("none");
  for (const ex of r.pairExamples) console.log(`- ${ex}`);
  console.log("");
}

function main(): void {
  const args = process.argv.slice(2);
  const all = args.includes("--all");
  const positional = args.filter((a) => !a.startsWith("--"));
  const dir = sessionDir();

  let files: string[];
  if (positional.length) {
    files = positional;
  } else {
    try {
      files = all
        ? readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => join(dir, f)).sort()
        : [newestSession(dir) ?? ""].filter(Boolean);
    } catch {
      console.error(`no session dir for cwd: ${dir} — pass a session file path`);
      process.exit(1);
    }
  }
  if (!files.length) {
    console.error(`no session files in ${dir} — pass a session file path`);
    process.exit(1);
  }

  const reports: ThreadReport[] = [];
  for (const f of files) {
    try {
      const r = analyze(f);
      if (r) reports.push(r);
    } catch (e) {
      console.error(`unreadable: ${f} (${(e as Error).message})`);
      process.exit(2);
    }
  }
  if (!reports.length) {
    console.error("no parseable entries");
    process.exit(2);
  }

  for (const r of reports) printReport(r);

  if (reports.length > 1) {
    const failFiles = new Map<string, Set<string>>();
    for (const r of reports) {
      for (const f of r.failures) {
        if (!failFiles.has(f.cmd)) failFiles.set(f.cmd, new Set());
        failFiles.get(f.cmd)!.add(r.file.split("/").pop()!);
      }
    }
    const recurrent = [...failFiles.entries()].filter(([, s]) => s.size > 1);
    console.log(`### Cross-run recurrence (${recurrent.length})`);
    if (!recurrent.length) console.log("none");
    for (const [cmd, s] of recurrent) console.log(`- ${s.size} sessions: ${cmd}`);
  }
}

main();
