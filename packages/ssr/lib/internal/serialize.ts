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
 * Checks if a value is a plain object (not null, not array, not class instance).
 * Mirror of core's `isPlainObject` — ssr ships zero runtime dependencies, so the
 * guard is duplicated rather than imported; keep the two in sync.
 * @param value The value to check
 * @returns True if the value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;

  const proto = Object.getPrototypeOf(value) as typeof Object.prototype | null;

  const hasObjectPrototype =
    proto === null ||
    proto === Object.prototype ||
    Object.getPrototypeOf(proto) === null; // Cross-realm support

  if (!hasObjectPrototype) return false;

  return Object.prototype.toString.call(value) === "[object Object]";
}

/**
 * @internal
 * Serializes a property/attribute to its HTML string form, mirroring dom's `renderProp` rules.
 *
 * `renderProp`'s DIRECT_PROPS special-case (value/checked/selected/innerHTML → set the DOM IDL
 * property) is intentionally NOT mirrored — emitting `checked=""` would mean CHECKED in HTML.
 * `renderProp`'s custom-element property branch (hyphenated tag + `key in element` → raw property
 * assignment) has no server equivalent — there is no element instance to probe, so object/array
 * props on custom elements stringify via the generic branch server-side.
 */
export function serializeProp(key: string, value: unknown): string {
  const isFalsy = value === false || value === null || value === undefined;
  if (isFalsy) return "";                          // omit (renderProp removeAttribute equivalent)
  if (key === "style" && isPlainObject(value)) {   // style objects — byte-parity with renderProp
    const entries = Object.entries(value);
    let i = 0;
    const len = entries.length;
    const declarations: string[] = [];
    while (i < len) {
      const [prop, val] = entries[i]!;
      if (val) {
        declarations.push(`${prop.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${val}`);
      }
      i++;
    }
    return declarations.length ? ` style="${escapeHtml(declarations.join("; "))}"` : "";
  }
  if (value === true) return ` ${key}`;            // boolean attribute (renderProp setAttribute(key,"") equivalent)
  if (Array.isArray(value)) {                      // class lists — renderProp joins filtering falsy
    const joined = value.filter(Boolean).join(" ");
    return joined ? ` ${key}="${escapeHtml(joined)}"` : "";
  }
  return ` ${key}="${escapeHtml(`${value}`)}"`;    // generic value (covers value/innerHTML strings)
}
