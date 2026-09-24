import { style } from "@hellajs/css";

export const base = "";

export const list = style({
  alignItems: "center",
  color: "var(--muted-foreground)",
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.875rem",
  gap: "0.375rem",
  lineHeight: "1.25rem",
  overflowWrap: "break-word",
  "@media (min-width: 40rem)": {
    "&": {
      gap: "0.625rem",
    },
  },
}, { label: "hella-breadcrumb-list", layer: "hella" });

export const item = style({
  alignItems: "center",
  display: "inline-flex",
  gap: "0.375rem",
}, { label: "hella-breadcrumb-item", layer: "hella" });

export const link = style({
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    color: "var(--foreground)",
  },
}, { label: "hella-breadcrumb-link", layer: "hella" });

export const page = style({
  color: "var(--foreground)",
  fontWeight: "400",
}, { label: "hella-breadcrumb-page", layer: "hella" });

export const separator = style({
  "& svg": {
    height: "0.875rem",
    width: "0.875rem",
  },
}, { label: "hella-breadcrumb-separator", layer: "hella" });

export const ellipsis = style({
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
}, { label: "hella-breadcrumb-ellipsis", layer: "hella" });

export const ellipsisIcon = style({
  height: "1rem",
  width: "1rem",
}, { label: "hella-breadcrumb-ellipsis-icon", layer: "hella" });

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
}, { label: "hella-breadcrumb-sr-only", layer: "hella" });
