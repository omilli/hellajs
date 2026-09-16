import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { logger, projectRoot } from "../utils/index.js";

/** The repo knowledge base root. */
const MEMORY_ROOT = join(projectRoot, "memory");

/** Active concepts (`memory/entries/*.md`, canonical single source). */
const ENTRIES_DIR = join(MEMORY_ROOT, "entries");

/** Retired concepts (`memory/archive/`); the supersede sink. */
const ARCHIVE_DIR = join(MEMORY_ROOT, "archive");

/** Frontmatter line for the staleness surface (`memory.ts stale` parity). */
const LAST_CONFIRMED_LINE = /^last_confirmed:\s*(\d{4}-\d{2}-\d{2})\s*$/;

/** Frontmatter line for the concept title (quote-stripped on read). */
const TITLE_LINE = /^title:\s*(.*)$/;

/** Frontmatter line naming the retired predecessor. */
const SUPERSEDES_LINE = /^supersedes:\s*(\S+)\s*$/;

/** One active KB concept queued for verification. */
export interface MemoryEntry {
  /** Concept ID — the leading numeric run of the filename stem. */
  id: string;
  /** Filename stem (`NNN-slug`). */
  stem: string;
  /** Absolute entry file path. */
  file: string;
  /** Frontmatter title, quotes stripped; empty when absent. */
  title: string;
  /** Frontmatter `last_confirmed` date (`YYYY-MM-DD`). */
  lastConfirmed: string;
}

/** Queue derivation options. */
export interface QueueOptions {
  /** Skip the staleness filter and queue every active entry. */
  all: boolean;
  /** Staleness cutoff in days (`last_confirmed` older than this queues the entry). */
  days: number;
  /** Cap the queue to the first N entries (after oldest-first sorting). */
  limit?: number;
}

/** Post-run outcome of one entry, classified from the before/after file state. */
export type EntryOutcome =
  | { kind: "unchanged" }
  | { kind: "refreshed" }
  | { kind: "superseded"; successor: string | null }
  | { kind: "removed" };

/**
 * Read one entry file's frontmatter into a queue record; null when
 * `last_confirmed` is missing or malformed (warned — `memory.ts stale`
 * skips such entries too, so the runner and the staleness surface agree).
 *
 * @param file Absolute entry file path.
 * @param name Filename, for the warning.
 * @returns The entry record, or null when the entry cannot be ordered.
 */
function readEntry(file: string, name: string): MemoryEntry | null {
  const text = readFileSync(file, "utf-8");
  const lines = text.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") {
    logger.warn(`no frontmatter in ${name} — skipped`);
    return null;
  }
  let lastConfirmed: string | null = null;
  let title = "";
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    if (line === "---") {
      break;
    }
    const confirmed = LAST_CONFIRMED_LINE.exec(line);
    if (confirmed !== null) {
      lastConfirmed = confirmed[1] ?? null;
      continue;
    }
    const titleMatch = TITLE_LINE.exec(line);
    if (titleMatch !== null) {
      title = (titleMatch[1] ?? "").trim().replace(/^["']|["']$/g, "");
    }
  }
  if (lastConfirmed === null || !isCalendarDate(lastConfirmed)) {
    logger.warn(`bad last_confirmed in ${name} — skipped`);
    return null;
  }
  const stem = name.slice(0, -3);
  return {
    id: /^\d+/.exec(stem)?.[0] ?? stem,
    stem,
    file,
    title,
    lastConfirmed,
  };
}

/**
 * Validate a `YYYY-MM-DD` string as a real calendar date (local).
 *
 * @param value The parsed frontmatter value.
 * @returns True when the string is a well-formed calendar date.
 */
function isCalendarDate(value: string): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (parts === null) {
    return false;
  }
  const y = Number(parts[1]);
  const m = Number(parts[2]) - 1;
  const d = Number(parts[3]);
  const date = new Date(y, m, d);
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d;
}

/**
 * Check whether a date is older than the staleness cutoff (`memory.ts
 * stale` semantics: strict `last_confirmed < local midnight of today − days`).
 *
 * @param lastConfirmed The entry's `last_confirmed` date.
 * @param days The cutoff in days.
 * @returns True when the entry is stale.
 */
function isStale(lastConfirmed: string, days: number): boolean {
  const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(lastConfirmed);
  if (parts === null) {
    return false;
  }
  const confirmed = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const cutoff = new Date(today.getFullYear(), today.getMonth(), today.getDate() - days);
  return confirmed < cutoff;
}

/**
 * Derive the verification queue: active entries, oldest `last_confirmed`
 * first (tie-break filename), stale-filtered unless `all`, capped by
 * `limit`. Read-only — the runner never writes KB content.
 *
 * @param options Staleness filter, widening, and cap.
 * @returns The queue in execution order.
 */
export function deriveQueue(options: QueueOptions): MemoryEntry[] {
  if (!existsSync(ENTRIES_DIR)) {
    throw new Error(`no knowledge base at ${ENTRIES_DIR}`);
  }
  const entries: MemoryEntry[] = [];
  for (const name of readdirSync(ENTRIES_DIR).filter((f: string): boolean => f.endsWith(".md")).sort()) {
    const entry = readEntry(join(ENTRIES_DIR, name), name);
    if (entry === null) {
      continue;
    }
    if (options.all || isStale(entry.lastConfirmed, options.days)) {
      entries.push(entry);
    }
  }
  entries.sort((a: MemoryEntry, b: MemoryEntry): number =>
    a.lastConfirmed < b.lastConfirmed ? -1 : a.lastConfirmed > b.lastConfirmed ? 1 : a.stem < b.stem ? -1 : a.stem > b.stem ? 1 : 0,
  );
  return options.limit === undefined ? entries : entries.slice(0, options.limit);
}

/**
 * Snapshot an entry's content before its verification instance runs.
 *
 * @param file Absolute entry file path.
 * @returns The file content.
 */
export function snapshotEntry(file: string): string {
  return readFileSync(file, "utf-8");
}

/**
 * Find the entry that superseded a retired concept, by its `supersedes:`
 * frontmatter pointer.
 *
 * @param id The retired concept's ID.
 * @returns The successor's stem, or null when none names it.
 */
function findSuccessor(id: string): string | null {
  for (const name of readdirSync(ENTRIES_DIR).filter((f: string): boolean => f.endsWith(".md")).sort()) {
    const text = readFileSync(join(ENTRIES_DIR, name), "utf-8");
    for (const line of text.split(/\r?\n/)) {
      const match = SUPERSEDES_LINE.exec(line.trim());
      if (match !== null && stripLeadingZeros(match[1] ?? "") === stripLeadingZeros(id)) {
        return name.slice(0, -3);
      }
    }
  }
  return null;
}

/** Strip leading zeros so ID comparison tolerates `007` vs `7`. */
function stripLeadingZeros(value: string): string {
  return value.replace(/^0+/, "");
}

/**
 * Classify what the verification instance did to one entry, from the
 * pre-run snapshot: same content → `unchanged`; different content →
 * `refreshed`; file gone and archived → `superseded` (successor resolved
 * when some entry names it); file gone, not archived → `removed`.
 *
 * @param file Absolute entry file path.
 * @param before The pre-run content from {@link snapshotEntry}.
 * @returns The outcome.
 */
export function classifyOutcome(file: string, before: string): EntryOutcome {
  if (existsSync(file)) {
    return readFileSync(file, "utf-8") === before ? { kind: "unchanged" } : { kind: "refreshed" };
  }
  if (!existsSync(join(ARCHIVE_DIR, basename(file)))) {
    return { kind: "removed" };
  }
  const id = /^\d+/.exec(basename(file))?.[0] ?? "";
  return { kind: "superseded", successor: id === "" ? null : findSuccessor(id) };
}
