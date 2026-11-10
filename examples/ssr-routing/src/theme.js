import { css, vars } from "@hellajs/css";

export const tokens = vars({
  color: { primary: "#2563eb", text: "#333" },
  space: { nav: "1rem" },
});

css({
  body: {
    fontFamily: "sans-serif",
    margin: "0",
    color: tokens.color.text,
  },
  nav: {
    display: "flex",
    gap: tokens.space.nav,
    padding: tokens.space.nav,
    borderBottom: "1px solid #e5e7eb",
    a: {
      color: tokens.color.primary,
      textDecoration: "none",
      "&.active": {
        fontWeight: "700",
        textDecoration: "underline",
      },
    },
  },
  main: {
    padding: tokens.space.nav,
  },
});
