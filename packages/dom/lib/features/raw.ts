import type { HellaRaw } from "../types/nodes";
import { setRawHtmlParser } from "../internal/render";

/**
 * Parses a raw HTML string into a fragment for insertion. The template parser resolves
 * namespaces natively, so raw content needs no namespace feature.
 * @param html The raw HTML string
 * @returns The parsed fragment
 */
function rawToFragment(html: string): DocumentFragment {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return tpl.content;
}

/**
 * Wraps a raw HTML string as an opaque child. `ssr` emits it verbatim, marker-bounded
 * (`<!--[-->…<!--]-->`); `hydrate` adopts the existing server DOM without re-binding anything inside.
 *
 * Use for meta-framework slot passthrough (e.g. Astro `slots`), where a foreign renderer has already
 * produced HTML that must embed into a HellaNode tree unescaped. **Never** pass unsanitized user input —
 * `raw()` bypasses HTML escaping (XSS); sanitize first.
 * @param html The raw HTML string.
 * @returns A {@link HellaRaw} sentinel consumed by `ssr`/`hydrate`.
 */
export function raw(html: string): HellaRaw {
  return { raw: html };
}

setRawHtmlParser(rawToFragment);
