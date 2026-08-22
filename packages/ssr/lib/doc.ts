import { serializeProp } from "./internal/serialize";
import { buildHead } from "./internal/head";
import type { DocOptions } from "./types";

/**
 * Assembles a rendered body and an optional head into a complete HTML document string.
 *
 * A pure string builder with zero server-runtime coupling — no Request/Response, no host API —
 * so it runs identically in Bun, Node, Deno, Express, and Hono. The `body` is the output of
 * [`ssr`](./ssr)/[`ssrAsync`](./ssrAsync), placed verbatim. For a streamed body use
 * [`docStream`](./docStream) — it wraps a `ReadableStream` body in the same document shell without
 * collecting it. Head fields escape consistently with the rest of the package: `title` text and
 * attribute values run through the same `serializeProp`/`escapeHtml` rules, while `body` and
 * `head.raw` pass through unchanged (they are already HTML). `<meta>` and `<link>` render void
 * (no closing tag); `<title>`, `<style>`, and `<script>` carry closing tags.
 * @param options The document options. `body` is required.
 * @returns A full HTML document string: `<!DOCTYPE html><html[ lang="…"]><head>…</head><body>…</body></html>`.
 * @throws {Error} When `options.body` is undefined.
 */
export function doc(options: DocOptions): string {
  if (options.body === undefined) {
    throw new Error(`[ssr] doc: body is required, received ${options.body}`);
  }

  return `<!DOCTYPE html><html${serializeProp("lang", options.lang)}><head>${buildHead(options.head)}</head><body>${options.body}</body></html>`;
}
