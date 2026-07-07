// Fragment tag constant used for JSX fragments and component fragments
export const FRAGMENT_TAG = "$";

// Passthrough components that bypass component() wrapping
export const PASSTHROUGH_NAMES = new Set(["ForEach", "Portal", "Lazy"]);
