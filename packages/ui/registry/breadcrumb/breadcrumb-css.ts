import { style } from "@hellajs/css";

export const list = style({
  alignItems: "center",
  color: "var(--muted-foreground)",
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.875rem",
  gap: "0.375rem",
  lineHeight: "1.25rem",
  listStyle: "none",
  margin: "0",
  overflowWrap: "break-word",
  padding: "0",
  "@media (min-width: 40rem)": {
    "&": {
      gap: "0.625rem",
    },
  },
}, { label: "breadcrumb-list" });

export const item = style({
  alignItems: "center",
  display: "inline-flex",
  gap: "0.375rem",
}, { label: "breadcrumb-item" });

export const link = style({
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    color: "var(--foreground)",
  },
}, { label: "breadcrumb-link" });

export const page = style({
  color: "var(--foreground)",
  fontWeight: "400",
}, { label: "breadcrumb-page" });

export const separator = style({
  "& svg": {
    height: "0.875rem",
    width: "0.875rem",
  },
}, { label: "breadcrumb-separator" });

export const ellipsis = style({
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
}, { label: "breadcrumb-ellipsis" });

export const ellipsisIcon = style({
  height: "1rem",
  width: "1rem",
}, { label: "breadcrumb-ellipsis-icon" });

export const srOnly = style({
  border: "0",
  clip: "rect(0, 0, 0, 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
}, { label: "breadcrumb-sr-only" });
