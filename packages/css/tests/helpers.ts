// Shared css test helpers.

/**
 * Creates a fresh shadow root host attached to the document body.
 */
export function createShadowHost(): ShadowRoot {
  const el = document.createElement("shadow-host");
  document.body.appendChild(el);
  return el.attachShadow({ mode: "open" });
}
