import { css, cssVars } from "@hellajs/css";

export const theme = cssVars({
  color: {
    bg: "#f5f5f5",
    surface: "#fff",
    border: "#e0e0e0",
    text: "#333",
    muted: "#555",
    subtle: "#888",
    link: "#2563eb",
    tag: "#e8e8e8",
  },
  radius: {
    sm: "0.375rem",
    md: "0.5rem",
    pill: "1rem",
  },
});

css({
  body: {
    margin: 0,
    fontFamily: "sans-serif",
    backgroundColor: theme.color.bg,
    color: theme.color.text,
  },
  ".card": {
    backgroundColor: theme.color.surface,
    borderRadius: theme.radius.md,
    padding: "1rem",
    marginBottom: "0.75rem",
    border: `1px solid ${theme.color.border}`,
  },
  ".card-title": {
    fontSize: "1.1rem",
    fontWeight: 600,
    margin: "0 0 0.5rem",
  },
  ".card-body": {
    color: theme.color.muted,
    fontSize: "0.9rem",
    lineHeight: 1.5,
  }
});
