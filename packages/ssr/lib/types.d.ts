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
 * Options for assembling a full HTML document.
 */
export interface DocOptions {
  /** Already-rendered HTML (from `ssr`/`ssrAsync`), placed verbatim — not re-escaped. For a streamed body use `docStream` — `doc` accepts a string only */
  body: string;
  /** Document head contents */
  head?: HeadOptions;
  /** Value for `<html lang="…">`; omitted from the tag when unset */
  lang?: string;
}

/**
 * Options for assembling a full streaming HTML document.
 */
export interface DocStreamOptions {
  /** Streamed HTML (from `ssrStream`), placed verbatim chunk-by-chunk — not re-escaped */
  body: ReadableStream<string>;
  /**
   * Mount-point selector wrapping the body — the same string `hydrate(node, selector)` targets
   * on the client (`'#app'`, `'main#app'`, `'.wrap.x'`). One optional tag (defaults to `div`),
   * at most one `#id`, any number of `.class` tokens (space-joined). Anything else throws.
   */
  mount?: string;
  /** Document head contents — rendered identically to `doc`'s head */
  head?: HeadOptions;
  /** Value for `<html lang="…">`; omitted from the tag when unset */
  lang?: string;
}
