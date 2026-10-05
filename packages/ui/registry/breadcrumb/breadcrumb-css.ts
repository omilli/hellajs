import { style } from "@hellajs/css";

export const list = style("breadcrumb-list", {
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
});

export const item = style("breadcrumb-item", {
  alignItems: "center",
  display: "inline-flex",
  gap: "0.375rem",
});

export const link = style("breadcrumb-link", {
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    color: "var(--foreground)",
  },
});

export const page = style("breadcrumb-page", {
  color: "var(--foreground)",
  fontWeight: "400",
});

export const separator = style("breadcrumb-separator", {
  "& svg": {
    height: "0.875rem",
    width: "0.875rem",
  },
});

export const ellipsis = style("breadcrumb-ellipsis", {
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
});

export const ellipsisIcon = style("breadcrumb-ellipsis-icon", {
  height: "1rem",
  width: "1rem",
});

export const srOnly = style("breadcrumb-sr-only", {
  border: "0",
  clip: "rect(0, 0, 0, 0)",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
});
