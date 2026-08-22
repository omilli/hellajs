import { serializeProp } from "./internal/serialize";
import { buildHead } from "./internal/head";
import type { DocOptions } from "./types";

/**
 * Parses a mount-point selector into its opening/closing wrapper tags. Accepts one optional tag
 * (validated as `^[a-zA-Z][\w-]*$`, defaulting to `div`), at most one `#id`, and any number of
 * `.class` tokens (space-joined in encounter order) — the shape a `hydrate` target selector takes
 * (`'#app'`, `'main#app'`, `'.wrap.x'`). Anything else (combinators, spaces, attribute selectors,
 * pseudo-classes, empty input) throws: a mount point is a single wrapping element.
 * @param mount The selector string.
 * @returns The opening tag (`<div id="app">`) and closing tag (`</div>`).
 * @throws {Error} When the selector uses anything beyond tag/`#id`/`.class` tokens.
 */
function parseMount(mount: string): { open: string; close: string } {
  if (mount === "") {
    throw new Error(`[ssr] doc: mount supports tag/#id/.class only, received "${mount}"`);
  }
  let tag: string | undefined;
  let id: string | undefined;
  const classes: string[] = [];
  let i = 0;
  const len = mount.length;
  while (i < len) {
    const kind = mount[i]!;
    i++;
    const start = i;
    while (i < len && mount[i] !== "#" && mount[i] !== ".") i++;
    const value = mount.slice(start, i);
    if (kind === "#") {
      if (id !== undefined || !/^[\w-]+$/.test(value)) {
        throw new Error(`[ssr] doc: mount supports tag/#id/.class only, received "${mount}"`);
      }
      id = value;
    } else if (kind === ".") {
      if (!/^[\w-]+$/.test(value)) {
        throw new Error(`[ssr] doc: mount supports tag/#id/.class only, received "${mount}"`);
      }
      classes.push(value);
    } else if (tag !== undefined || !/^[a-zA-Z][\w-]*$/.test(kind + value)) {
      // `kind` is the selector's first character — reattached so a leading-digit/`[`/`:` token fails the tag regex
      throw new Error(`[ssr] doc: mount supports tag/#id/.class only, received "${mount}"`);
    } else {
      tag = kind + value;
    }
  }
  const name = tag !== undefined ? tag : "div";
  return {
    open: `<${name}${serializeProp("id", id)}${serializeProp("class", classes.length ? classes.join(" ") : undefined)}>`,
    close: `</${name}>`,
  };
}

/**
 * Assembles a rendered body and an optional head into a complete HTML document string.
 *
 * A pure string builder with zero server-runtime coupling — no Request/Response, no host API —
 * so it runs identically in Bun, Node, Deno, Express, and Hono. The `body` is the string output of
 * `ssr`/`ssr.async`, placed verbatim; `mount` (optional) wraps it in the opening/closing tags the
 * client's `hydrate(node, selector)` targets. Head fields escape consistently with the rest of the
 * package: `title` text and attribute values run through the same `serializeProp`/`escapeHtml`
 * rules, while `body` and `head.raw` pass through unchanged (they are already HTML). `<meta>` and
 * `<link>` render void (no closing tag); `<title>`, `<style>`, and `<script>` carry closing tags.
 * @param options The document options. `body` is required.
 * @returns The full HTML document string: `<!DOCTYPE html><html[ lang="…"]><head>…</head><body>[mount]…[mount]</body></html>`.
 * @throws {Error} When `options.body` is undefined or `options.mount` is not a tag/`#id`/`.class` selector.
 */
export function doc(options: DocOptions & { body: string }): string;
/**
 * Assembles a streamed body and an optional head into a full streaming HTML document — the
 * streaming overload, discriminated by passing a `ReadableStream` body. Emits the document shell
 * (`<!DOCTYPE html>`, `<head>`, the `mount` wrapper) first, then pipes every body chunk through as
 * it arrives, then the closing tags — so progressive paint is preserved end-to-end: nothing waits
 * for the body to finish. The head renders identically to the string overload's (same builder), and
 * the suffix flushes only after the body closes — which for an `ssr.stream` body means after every
 * staged `<Suspense>` swap has streamed. A body-stream error errors the document stream; cancelling
 * the document stream cancels the body.
 * @param options The document options. `body` is required.
 * @returns A `ReadableStream<string>` of the full HTML document.
 * @throws {Error} When `options.body` is undefined or `options.mount` is not a tag/`#id`/`.class` selector.
 */
export function doc(options: DocOptions & { body: ReadableStream<string> }): ReadableStream<string>;
export function doc(options: DocOptions): string | ReadableStream<string> {
  if (options.body === undefined) {
    throw new Error(`[ssr] doc: body is required, received ${options.body}`);
  }
  const mount = options.mount !== undefined ? parseMount(options.mount) : undefined;
  if (typeof options.body === "string") {
    return `<!DOCTYPE html><html${serializeProp("lang", options.lang)}><head>${buildHead(options.head)}</head><body>${mount !== undefined ? mount.open : ""}${options.body}${mount !== undefined ? mount.close : ""}</body></html>`;
  }
  const prefix = `<!DOCTYPE html><html${serializeProp("lang", options.lang)}><head>${buildHead(options.head)}</head><body>${mount !== undefined ? mount.open : ""}`;
  const suffix = `${mount !== undefined ? mount.close : ""}</body></html>`;
  let done = false;                         // shared by start/cancel: skip the suffix once the stream is done (cancel/error)
  const reader = options.body.getReader();  // acquired up front: cancel() must reach the body through this reader (the stream is locked to it)
  return new ReadableStream<string>({
    async start(controller) {
      try {
        controller.enqueue(prefix);
        let chunk = await reader.read();
        while (!chunk.done) {
          controller.enqueue(chunk.value);
          chunk = await reader.read();
        }
        if (!done) controller.enqueue(suffix);
        if (!done) controller.close();
      } catch (err) {
        done = true;                        // a body-stream error (or late enqueue on a cancelled stream) — surface it
        controller.error(err);
      }
    },
    cancel(reason) {
      done = true;                          // stop the suffix flush; the consumer is gone
      return reader.cancel(reason);         // propagate so a cancelled document stops the body (and its staged swaps)
    },
  });
}
