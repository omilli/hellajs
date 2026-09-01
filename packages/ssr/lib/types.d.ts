/**
 * Options for the `ssr` and `ssr.async` walks. Head collection is opt-in: without a `head` bag every
 * element renders inline, byte-identical to calling with no options at all.
 */
export interface SsrOptions {
  /**
   * Head collection bag (from `ssr.head()`) — when present, the walk hoists `<title>`/`<meta>`/`<link>`/
   * `<style>` elements it encounters into the bag instead of emitting them: `<title>` text children land
   * concatenated in `title` (last wins), `<meta>`/`<link>` attribute maps append to `meta`/`links`
   * (falsy values dropped, as `doc`'s head builder omits them), and `<style>` CSS text appends to
   * `styles` unescaped (styles are CSS text, never HTML). Only text children hoist for
   * `<title>`/`<style>` — an element child leaves the tag rendered in place. Pass the filled bag
   * straight to `doc({ head })`.
   */
  head?: HeadOptions;
}

/**
 * Options for `ssr.stream`. Omitting `nonce` emits the inline swap scripts unattributed — byte-identical
 * to calling `ssr.stream(node)` with no options at all. `head` (from `SsrOptions`) fills during the
 * walk — post-hoc inspection only: a streamed document emits its `<head>` up front, so streaming
 * callers pass head entries to `doc` explicitly.
 */
export interface StreamOptions extends SsrOptions {
  /**
   * CSP nonce threaded onto every inline `<script>` the stream emits (the `$hs` bootstrap and each
   * per-region swap script) — text-escaped into a `nonce="…"` attribute, so a strict
   * `Content-Security-Policy` (no `unsafe-inline`) still lets the progressive swaps run. Pair it with a
   * response header carrying the same value, e.g. `script-src 'self' 'nonce-…'`.
   */
  nonce?: string;
}

/**
 * Attribute map for a `<meta>` tag — `{ charset }`, `{ name, content }`, or `{ property, content }`.
 */
export interface MetaTag {
  [key: string]: string | undefined;
}

/**
 * Attribute map for a `<link>` tag — `{ rel, href }` and any further attributes.
 */
export interface LinkTag {
  [key: string]: string | undefined;
}

/**
 * A `<script>` tag. `src` emits an external script; `content` emits inline JS (not escaped). When both are set, `content` wins and `src` is dropped (a `<script src=…>` would otherwise ignore its inline body).
 * `async`/`defer` are boolean attributes. Further string keys pass through as attributes.
 */
export interface ScriptTag {
  /** External script URL — emits `<script src="…">` */
  src?: string;
  /** Script MIME type (e.g. `"module"`) */
  type?: string;
  /** Boolean attribute — present bare when `true`, omitted when `false` */
  async?: boolean;
  /** Boolean attribute — present bare when `true`, omitted when `false` */
  defer?: boolean;
  /** Inline script body, placed verbatim (not escaped). When set, `src` is dropped so the inline script runs (a `<script src=…>` ignores its body). */
  content?: string;
  [key: string]: unknown;
}

/**
 * Contents of the document `<head>`. Fields emit in declaration order: `title`, `meta`,
 * `links`, `styles`, `scripts`, then `raw`.
 */
export interface HeadOptions {
  /** Document title — text-escaped (`& < > "`) */
  title?: string;
  /** `<meta>` tags, each rendered void (no closing tag) */
  meta?: MetaTag[];
  /** `<link>` tags, each rendered void (no closing tag) */
  links?: LinkTag[];
  /** CSS text blocks, joined (no separator) into a single `<style>` — not re-escaped */
  styles?: string[];
  /** `<script>` tags — `{ src }` external or `{ content }` inline */
  scripts?: ScriptTag[];
  /** Raw HTML appended verbatim to the head (escape hatch) */
  raw?: string;
}

/**
 * Options for assembling a full HTML document. The `body` type selects the mode: a `string`
 * body returns a string document; a `ReadableStream<string>` body returns a streaming document
 * (shell first, body chunks piped through, closing tags last).
 */
export interface DocOptions {
  /** Already-rendered HTML — the string output of `ssr`/`ssr.async`, or the `ReadableStream` from `ssr.stream` — placed verbatim, not re-escaped */
  body: string | ReadableStream<string>;
  /**
   * Mount-point selector wrapping the body — the same string `hydrate(node, selector)` targets
   * on the client (`'#app'`, `'main#app'`, `'.wrap.x'`). One optional tag (defaults to `div`),
   * at most one `#id`, any number of `.class` tokens (space-joined). Anything else throws.
   */
  mount?: string;
  /** Document head contents */
  head?: HeadOptions;
  /** Value for `<html lang="…">`; omitted from the tag when unset */
  lang?: string;
  /**
   * Server-side data serialized into the page — `JSON.stringify` output with every `<` escaped
   * to `\u003c`, emitted as `<script type="application/json" id="hella-data">…</script>` after
   * the mount wrapper, before `</body>`, in both modes (flushing with the suffix in stream mode).
   * The client reads it back with `JSON.parse(document.getElementById("hella-data").textContent)`.
   * Throws when the value is not JSON-serializable (circular); a lone function or symbol is not
   * data. Omitted emits nothing.
   */
  data?: unknown;
}

