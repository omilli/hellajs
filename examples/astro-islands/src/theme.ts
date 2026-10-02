import { css, style, cssText } from "@hellajs/css";

// css() registers global rules, style() scoped ones, on both platforms. The
// page imports `styles` below and inlines it into <head> server-side, so
// server-rendered markup is styled at first paint; client islands import the
// same module and re-register the same hashed rules on hydration.
css({
  body: {
    fontFamily: "system-ui, sans-serif",
    maxWidth: "42rem",
    margin: "2rem auto",
    padding: "0 1rem",
  },
  "#name-input": {
    padding: "0.375rem 0.625rem",
    fontSize: "1rem",
    borderRadius: "0.375rem",
    border: "1px solid #d1d5db",
  },
  "#greeting": {
    fontSize: "1.25rem",
    fontWeight: "600",
  },
});

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

// Collected after the registrations above, in first-registration order.
export const styles = cssText();
