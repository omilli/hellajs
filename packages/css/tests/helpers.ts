// Shared css test helpers.

/**
 * Creates a fresh shadow root host attached to the document body.
 */
export function createShadowHost(): ShadowRoot {
  const el = document.createElement("shadow-host");
  document.body.appendChild(el);
  return el.attachShadow({ mode: "open" });
}

/**
 * The live `hella-css` sheet, for asserting rule counts against the CSSOM.
 */
export function getCssSheet(): CSSStyleSheet {
  return (document.getElementById("hella-css") as HTMLStyleElement).sheet as CSSStyleSheet;
}
