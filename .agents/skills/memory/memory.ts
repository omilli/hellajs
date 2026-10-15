/**
 * Memory KB write-path CLI over the flat `memory/` store.
 *
 * Entries are self-contained `NNN-slug.md` files at the repo-root `memory/`
 * dir (resolved via the git-toplevel walk from CWD): YAML frontmatter
 * (title / description / tags / confirmed) plus a `# Why` / `# Evidence`
 * body. The ID is the leading numeric prefix; allocation is max+1 — IDs are
 * never reused. Discovery is `rg -i -l '<term>' memory/` (the read protocol
 * lives in the prime skill); this script owns the write path.
 *
 * Commands:
 *   add "<imperative title>"  allocate max+1, write the template (title +
 *                             confirmed=today); the agent fills description,
 *                             tags, and body in the file afterward.
 *   confirm <id>              rewrite the `confirmed:` line to today in
 *                             place — everything else byte-preserved.
 *   stale [days=180]          list entries whose `confirmed` predates the
 *                             cutoff, oldest first.
 *
 * `confirm` is a command (not an agent file edit) so a still-true sweep
 * verdict always produces a mechanical file-state change — the runner
 * classifies outcomes from before/after content alone, zero prose parsing.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

const STALE_DEFAULT_DAYS = 180;
const ID_PAD = 3;
const SLUG_MAX_WORDS = 5;
const SLUG_MAX_CHARS = 40;
const SLUG_STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "on", "and", "or", "is", "are", "not", "with", "for", "from",
]);
const FM_LINE = /^(\w[\w-]*)\s*:\s*(.*)$/;
const YAML_PLAIN_BAD_START = "-?:,[]{}#&*!|>'\"%@`";

type FmValue = string | string[];

interface Frontmatter {
  [key: string]: FmValue;
}

/**
 * Resolve the repo knowledge base: `<git-toplevel>/memory`.
 *
 * Walks up from CWD for a `.git` marker; falls back to `./memory` (the
 * conventional repo-root layout). The script lives in
 * `.agents/skills/memory/`, so its own dir is NOT the KB — never default to
 * the script's parent.
 */
function defaultRoot(): string {
  let cur = process.cwd();
  for (;;) {
    if (existsSync(join(cur, ".git"))) return join(cur, "memory");
    const parent = dirname(cur);
    if (parent === cur) return join(process.cwd(), "memory");
    cur = parent;
  }
}

const ROOT = defaultRoot();

/** Print a warning line to stderr. */
function warn(msg: string): void {
  console.error(`warn: ${msg}`);
}

/** Normalize an unknown thrown value to a message string. */
function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Local calendar date as `YYYY-MM-DD` (not UTC). */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Today's local date as `YYYY-MM-DD`. */
function isoToday(): string {
  return isoDate(new Date());
}

/** Local midnight of the current date. */
function todayLocal(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/**
 * Parse a strict `YYYY-MM-DD` string as a LOCAL date; null when malformed or
 * non-calendar.
 */
function parseLocalDate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo || dt.getDate() !== d) return null;
  return dt;
}

/** Whole-day difference between two local midnights. */
function dayDiff(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / 86_400_000);
}

/** Resolve backslash-escapes inside a double-quoted YAML scalar. */
function unescapeDoubleQuoted(s: string): string {
  let out = "";
  let i = 0;
  while (i < s.length) {
    const c = s.charAt(i);
    if (c === "\\" && i + 1 < s.length && (s.charAt(i + 1) === '"' || s.charAt(i + 1) === "\\")) {
      out += s.charAt(i + 1);
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Plain-scalar safety: quote if empty, starts with a YAML indicator, ends
 * with a space, or contains `": "` / `" #"` (would mis-parse as a mapping).
 */
function needsQuote(v: string): boolean {
  if (v === "" || YAML_PLAIN_BAD_START.includes(v.charAt(0)) || v.endsWith(" ")) return true;
  return v.includes(": ") || v.includes(" #");
}

/** Serialize a scalar as a YAML plain scalar, double-quoted when unsafe. */
function yamlStr(v: string): string {
  if (needsQuote(v)) return `"${v.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  return v;
}

/** Parse an entry file into its frontmatter map and body. */
function parseFrontmatter(text: string): { fm: Frontmatter; body: string } {
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { fm: {}, body: text };
  let end = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim() === "---") {
      end = i;
      break;
    }
  }
  if (end === -1) return { fm: {}, body: text };
  const fm: Frontmatter = {};
  for (const ln of lines.slice(1, end)) {
    const s = ln.trim();
    if (!s || s.startsWith("#")) continue;
    const m = FM_LINE.exec(s);
    if (!m?.[1] || m[2] === undefined) continue;
    let val: FmValue = m[2].trim();
    if (val.startsWith("[") && val.endsWith("]")) {
      const inner = val.slice(1, -1).trim();
      val = inner ? inner.split(",").map((x) => x.trim()).filter((x) => x !== "") : [];
    } else if (
      val.length >= 2 &&
      (val.charAt(0) === '"' || val.charAt(0) === "'") &&
      val.charAt(0) === val.charAt(val.length - 1)
    ) {
      val = val.charAt(0) === '"' ? unescapeDoubleQuoted(val.slice(1, -1)) : val.slice(1, -1);
    }
    fm[m[1]] = val;
  }
  const body = lines.slice(end + 1).join("\n").replace(/^\n+/, "");
  return { fm, body };
}

/** Serialize a frontmatter map back to its `---`-fenced block (LF, key order preserved). */
function serializeFrontmatter(fm: Frontmatter): string {
  const out = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) out.push(`${k}: [${v.join(", ")}]`);
    else out.push(`${k}: ${yamlStr(v)}`);
  }
  out.push("---");
  return out.join("\n");
}

/** The leading numeric run of a filename stem; null when the stem has none. */
function numericPrefix(stem: string): string | null {
  return /^(\d+)/.exec(stem)?.[1] ?? null;
}

/** Strip leading zeros for leading-zero-tolerant ID comparison. */
function stripZeros(s: string): string {
  return s.replace(/^0+/, "");
}

/** Zero-pad an ID to its canonical width. */
function formatId(n: number): string {
  return String(n).padStart(ID_PAD, "0");
}

/** Every entry file in the flat KB, sorted by filename. */
function listEntries(): string[] {
  if (!existsSync(ROOT)) return [];
  return readdirSync(ROOT).filter((f) => f.endsWith(".md")).sort().map((f) => join(ROOT, f));
}

/** The highest existing numeric prefix across the KB; 0 when empty (next ID = max+1). */
function maxId(): number {
  let max = 0;
  for (const file of listEntries()) {
    const n = numericPrefix(basename(file).slice(0, -3));
    if (n !== null) max = Math.max(max, Number(n));
  }
  return max;
}

/**
 * Derive the filename slug from a title: lowercase kebab-case over
 * alphanumeric words, trivial stopwords dropped, first 5 words kept, capped
 * at ~40 chars on a word boundary. Empty when nothing survives.
 */
function slugify(title: string): string {
  const words = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w !== "" && !SLUG_STOPWORDS.has(w));
  let slug = words.slice(0, SLUG_MAX_WORDS).join("-");
  if (slug.length > SLUG_MAX_CHARS) {
    slug = slug.slice(0, SLUG_MAX_CHARS);
    const boundary = slug.lastIndexOf("-");
    if (boundary > 0) slug = slug.slice(0, boundary);
  }
  return slug;
}

/**
 * Allocate max+1 and write the entry template `NNN-slug.md` with `title`
 * filled and `confirmed` = today; the agent fills description / tags / body
 * in the file afterward.
 *
 * @param title The imperative title — the rule/fact itself.
 * @returns The exit code.
 */
function cmdAdd(title: string): number {
  mkdirSync(ROOT, { recursive: true });
  const id = formatId(maxId() + 1);
  const slug = slugify(title) || "entry";
  const fm: Frontmatter = {
    title,
    description: "One-sentence actionable core.",
    tags: [],
    confirmed: isoToday(),
  };
  const body =
    "# Why\n\n" +
    "Rationale / what breaks if ignored.\n\n" +
    "# Evidence\n\n" +
    "Source citation or the passing command.\n";
  const file = join(ROOT, `${id}-${slug}.md`);
  writeFileSync(file, `${serializeFrontmatter(fm)}\n${body}`, "utf-8");
  console.log(relative(ROOT, file));
  return 0;
}

/**
 * Resolve an entry by numeric prefix (leading-zero tolerant) and rewrite its
 * `confirmed:` line to today in place — every other byte preserved. A no-op
 * when the date already is today.
 *
 * @param idArg The numeric ID (e.g. `007` or `7`).
 * @returns The exit code.
 */
function cmdConfirm(idArg: string): number {
  const want = numericPrefix(idArg);
  if (want === null) {
    console.error(`error: '${idArg}' carries no numeric prefix`);
    return 1;
  }
  const file = listEntries().find((f) => {
    const n = numericPrefix(basename(f).slice(0, -3));
    return n !== null && stripZeros(n) === stripZeros(want);
  });
  if (file === undefined) {
    console.error(`error: no entry with ID ${formatId(Number(want))}`);
    return 1;
  }
  const text = readFileSync(file, "utf-8");
  const lines = text.split("\n");
  const idx = lines.findIndex((ln) => /^confirmed:/.test(ln));
  if (idx === -1) {
    console.error(`error: no 'confirmed:' line in ${relative(ROOT, file)}`);
    return 1;
  }
  const today = isoToday();
  if (lines[idx] === `confirmed: ${today}`) {
    console.log(`already confirmed ${today}: ${relative(ROOT, file)}`);
    return 0;
  }
  lines[idx] = `confirmed: ${today}`;
  writeFileSync(file, lines.join("\n"), "utf-8");
  console.log(`confirmed ${formatId(Number(want))} → ${today}: ${relative(ROOT, file)}`);
  return 0;
}

/**
 * List entries whose `confirmed` is older than `days` days, oldest first.
 * Entries with a missing or malformed date are warned and skipped.
 *
 * @param days Age cutoff in days.
 * @returns The exit code.
 */
function cmdStale(days: number): number {
  const today = todayLocal();
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  const found: Array<{ age: number; id: string; confirmed: string; file: string }> = [];
  for (const file of listEntries()) {
    const stem = basename(file).slice(0, -3);
    const confirmed = String(parseFrontmatter(readFileSync(file, "utf-8")).fm["confirmed"] ?? "");
    const date = parseLocalDate(confirmed);
    if (!date) {
      warn(`bad confirmed date in ${stem}: '${confirmed}'`);
      continue;
    }
    if (date < cutoff) {
      found.push({ age: dayDiff(today, date), id: numericPrefix(stem) ?? stem, confirmed, file });
    }
  }
  found.sort((a, b) => b.age - a.age);
  if (found.length === 0) {
    console.log(`no entries older than ${days} days`);
    return 0;
  }
  for (const { age, id, confirmed, file } of found) {
    console.log(`${id}  age=${age}d  confirmed=${confirmed}  ${relative(ROOT, file)}`);
  }
  return 0;
}

/** Print usage to stderr and exit nonzero. */
function usage(): never {
  console.error(
    "usage: bun .agents/skills/memory/memory.ts <command> [args]\n" +
      'commands: add "<imperative title>" | confirm <id> | stale [days=180]'
  );
  process.exit(2);
}

/** Parse a strict non-negative integer CLI positional. */
function parseDays(s: string): number {
  const n = Number(s);
  if (!Number.isInteger(n) || n < 0) usage();
  return n;
}

/** CLI entry: dispatch the subcommand, return its exit code. */
function main(): number {
  const rest = process.argv.slice(2);
  const cmd = rest.shift();
  switch (cmd) {
    case "add":
      if (rest.length !== 1) usage();
      return cmdAdd(rest[0] ?? "");
    case "confirm":
      if (rest.length !== 1) usage();
      return cmdConfirm(rest[0] ?? "");
    case "stale": {
      if (rest.length > 1) usage();
      const days = rest.length === 1 ? parseDays(rest[0] ?? "") : STALE_DEFAULT_DAYS;
      return cmdStale(days);
    }
    default:
      usage();
  }
}

try {
  process.exit(main());
} catch (e) {
  console.error(`error: ${errorMessage(e)}`);
  process.exit(1);
}
