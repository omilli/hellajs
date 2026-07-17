/**
 * @internal
 * HTML void elements — emitted as `<tag ...>` with no closing tag (the DOM has no child nodes for these).
 */
export const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

/**
 * @internal
 * Escapes the HTML-significant characters for text or a double-quoted attribute (`& < > "`).
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @internal
 * Serializes a property/attribute to its HTML string form, mirroring dom's `renderProp` rules.
 *
 * `renderProp`'s DIRECT_PROPS special-case (value/checked/selected/innerHTML → set the DOM IDL
 * property) is intentionally NOT mirrored — emitting `checked=""` would mean CHECKED in HTML.
 */
export function serializeProp(key: string, value: unknown): string {
  const isFalsy = value === false || value === null || value === undefined;
  if (isFalsy) return "";                          // omit (renderProp removeAttribute equivalent)
  if (value === true) return ` ${key}`;            // boolean attribute (renderProp setAttribute(key,"") equivalent)
  if (Array.isArray(value)) {                      // class lists — renderProp joins filtering falsy
    const joined = value.filter(Boolean).join(" ");
    return joined ? ` ${key}="${escapeHtml(joined)}"` : "";
  }
  return ` ${key}="${escapeHtml(`${value}`)}"`;    // generic value (covers value/innerHTML strings)
}
