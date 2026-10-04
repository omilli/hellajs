import { style } from "@hellajs/css";

export const base = style({
  display: "flex",
  justifyContent: "center",
  marginInline: "auto",
  width: "100%",
}, { label: "pagination" });

export const content = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "row",
  gap: "0.25rem",
}, { label: "pagination-content" });

export const linkBase = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "pagination-link" });

export const linkVariants = {
  ghost: style({
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }, { label: "pagination-link-ghost" }),
  outline: style({
    background: "var(--background)",
    border: "1px solid var(--border)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *)": {
      borderColor: "var(--input)",
      background: "color-mix(in oklab, var(--input) 30%, transparent)",
    },
    "&:is(.dark *):hover": {
      background: "color-mix(in oklab, var(--input) 50%, transparent)",
    },
  }, { label: "pagination-link-outline" }),
};

export const linkSizes = {
  default: style({
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }, { label: "pagination-link-size-default" }),
  xs: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    fontSize: "0.75rem",
    gap: "0.25rem",
    height: "1.5rem",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    "&:has(> svg)": {
      paddingInline: "0.375rem",
    },
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "pagination-link-size-xs" }),
  sm: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }, { label: "pagination-link-size-sm" }),
  lg: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }, { label: "pagination-link-size-lg" }),
  icon: style({
    height: "2.25rem",
    width: "2.25rem",
  }, { label: "pagination-link-size-icon" }),
  "icon-xs": style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "pagination-link-size-icon-xs" }),
  "icon-sm": style({
    height: "2rem",
    width: "2rem",
  }, { label: "pagination-link-size-icon-sm" }),
  "icon-lg": style({
    height: "2.5rem",
    width: "2.5rem",
  }, { label: "pagination-link-size-icon-lg" }),
};

export const previous = style({
  gap: "0.25rem",
  paddingInline: "0.625rem",
  "@media (min-width: 40rem)": {
    "&": {
      paddingLeft: "0.625rem",
    },
  },
}, { label: "pagination-previous" });

export const next = style({
  gap: "0.25rem",
  paddingInline: "0.625rem",
  "@media (min-width: 40rem)": {
    "&": {
      paddingRight: "0.625rem",
    },
  },
}, { label: "pagination-next" });

export const hiddenUntilSm = style({
  display: "none",
  "@media (min-width: 40rem)": {
    "&": {
      display: "block",
    },
  },
}, { label: "pagination-hidden-until-sm" });

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
}, { label: "pagination-sr-only" });

export const ellipsis = style({
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
  "& svg": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "pagination-ellipsis" });
