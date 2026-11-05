import fs from "node:fs";

/**
 * Fence extraction from markdown: the shared front half of the snippet
 * typecheck pipelines (`vp run doc-snippets` audit, `vp run skills-check`
 * gate). Knows nothing about skip policy — every consumer filters the
 * returned blocks itself.
 */

/** A fenced code block with its provenance and label context. */
export interface MarkdownBlock {
  /** Absolute path of the markdown file the block was extracted from. */
  source: string;
  /** 1-based line number of the block's first content line. */
  line: number;
  /** Fence language tag (`ts`, `tsx`, `jsx`, `typescript`, `js`, ...). */
  lang: string;
  /** Raw fence content, lines joined with `"\n"`. */
  text: string;
  /** Nearest preceding bold label line: "Incorrect" or "Correct" ("" when none). */
  label: string;
}

/** Fence opener: triple backticks + word-char language tag, nothing else on the line. */
const FENCE_OPEN_RE = /^```(\w+)\s*$/;
/** Bold label lines (`**Incorrect (what is wrong):**`) — the best-practices rule anatomy's example markers. */
const LABEL_RE = /^\*\*(Incorrect|Correct)\b/;

/**
 * Extracts fenced blocks whose language tag is in `langs`, tracking source
 * file, 1-based start line, and label context: the nearest preceding
 * `**Incorrect` / `**Correct` bold label line outside any fence (skills
 * rules mark their bad-practice examples with an Incorrect label; the
 * skills-check gate skips those blocks). Wanted fences are skipped wholesale
 * while scanning, so a label-looking line inside an example never leaks
 * into label context.
 * @param file Absolute markdown file path
 * @param langs Fence language tags to collect
 * @returns Blocks in document order
 */
export function extractBlocks(file: string, langs: Set<string>): MarkdownBlock[] {
  const lines = fs.readFileSync(file, "utf-8").split("\n");
  const blocks: MarkdownBlock[] = [];
  let label = "";
  let i = 0;
  while (i < lines.length) {
    const m = lines[i]!.match(FENCE_OPEN_RE);
    if (m === null || !langs.has(m[1]!)) {
      const labeled = lines[i]!.match(LABEL_RE);
      if (labeled !== null) label = labeled[1]!;
      i += 1;
      continue;
    }
    const lang = m[1]!;
    const start = i + 1;
    let j = i + 1;
    while (j < lines.length && !lines[j]!.startsWith("```")) j += 1;
    const text = lines.slice(start, j).join("\n");
    blocks.push({ source: file, line: start, lang, text, label });
    i = j + 1;
  }
  return blocks;
}
