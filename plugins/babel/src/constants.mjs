// Fragment tag constant used for JSX fragments and component fragments
export const FRAGMENT_TAG = "$";

// HTML void elements: parsed as leaf nodes, never pushed to the nesting stack
// (mirrors the local VOID_TAGS in packages/dom/lib/internal/template.ts — the
// plugin has no runtime deps, so the parity corpus guards the drift)
export const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr"
]);

// Passthrough components that bypass component() wrapping
export const PASSTHROUGH_NAMES = new Set(["ForEach", "Portal", "Lazy"]);
