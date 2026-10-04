import { style } from "@hellajs/css";

// Island theme: style() registers at runtime wherever this module loads, so
// client:only islands re-register their rules on the client after loading it.
// The .astro page collects these same calls at build through the import
// graph, which is what styles server-rendered island markup at first paint.

export const counterBtn = style({
  padding: "0.5rem 1.25rem",
  fontSize: "1rem",
  cursor: "pointer",
  borderRadius: "0.375rem",
  border: "1px solid #2563eb",
  backgroundColor: "#eff6ff",
}, { label: "counter-btn" });

export const tracker = style({
  marginTop: "1rem",
  padding: "1rem",
  minHeight: "3rem",
  border: "1px dashed #9ca3af",
  borderRadius: "0.375rem",
}, { label: "tracker" });

export const note = style({
  color: "#6b7280",
}, { label: "note" });
