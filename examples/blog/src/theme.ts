import { css, reset, vars } from "@hellajs/css";

css(reset);

export const theme = vars({
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
  a: {
    color: theme.color.link,
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
});
