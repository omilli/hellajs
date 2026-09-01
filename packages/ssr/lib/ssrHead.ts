import type { HeadOptions } from "./types";

/**
 * @internal
 * Creates a fresh head collection bag — the `ssr.head()` namespace member. The returned `HeadOptions`
 * is structurally what `doc({ head })` already consumes, so a walk's bag passes straight into the
 * document assembler: `ssr.head()` → `ssr(node, { head })` → `doc({ body, head })`. `title` starts
 * unset (a hoisted `<title>` sets it, last wins); the empty `meta`/`links`/`styles` arrays emit nothing
 * in `doc`'s head when nothing hoists into them.
 * @returns A fresh, empty head bag (`{ meta: [], links: [], styles: [] }`).
 */
export function ssrHead(): HeadOptions {
  return { meta: [], links: [], styles: [] };
}
