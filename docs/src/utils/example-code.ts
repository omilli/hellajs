import { demoCode } from "./demo-code";

/**
 * Raw source of every demo module, keyed by demo name — the file stem
 * without the `-demo` suffix ("button" → button-demo.tsx). An eager `?raw`
 * glob: CodeExample is a server component, so resolution happens at build
 * time and no demo source ships to the client.
 */
const rawDemos = import.meta.glob("../demos/*-demo.tsx", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

const sources: Record<string, string> = {};
for (const [path, raw] of Object.entries(rawDemos)) {
  const stem = path.split("/").pop() ?? path;
  sources[stem.replace(/-demo\.tsx$/, "")] = raw;
}

/**
 * Slices one top-level `export function <Name>` block out of a demo
 * module's raw source — the View Code surface for the ui pages'
 * CodeExample cards. Unlike demoCode (caller supplies the raw source),
 * the module is resolved by demo name: each ui page's last URL segment
 * names both the page and its demo module (ui/button → button-demo.tsx).
 * Loud by construction — an unknown demo name or export name throws at
 * build time rather than rendering an empty card. A `;` trailing the
 * body's closing brace is kept when the source has one.
 * @param demo Demo module name (the page URL segment, e.g. "button")
 * @param exportName Function name of the export to slice
 * @returns The sliced source text
 */
export function exampleCode(demo: string, exportName: string): string {
  const raw = sources[demo];
  if (!raw) {
    const names = Object.keys(sources).join(", ") || "none";
    throw new Error(`exampleCode(): no demo module "${demo}-demo.tsx" (found: ${names})`);
  }
  const block = demoCode(raw, exportName);
  const end = raw.indexOf(block) + block.length;
  return raw[end] === ";" ? `${block}` : block;
}
