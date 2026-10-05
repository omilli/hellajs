import { style } from "@hellajs/css";

export const base = style("pagination", {
  display: "flex",
  justifyContent: "center",
  marginInline: "auto",
  width: "100%",
});

export const content = style("pagination-content", {
  alignItems: "center",
  display: "flex",
  flexDirection: "row",
  gap: "0.25rem",
});

export const linkBase = style("pagination-link", {
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
});

export const linkVariants = {
  ghost: style("pagination-link-ghost", {
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }),
  outline: style("pagination-link-outline", {
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
  }),
};

export const linkSizes = {
  default: style("pagination-link-size-default", {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }),
  xs: style("pagination-link-size-xs", {
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
  }),
  sm: style("pagination-link-size-sm", {
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  lg: style("pagination-link-size-lg", {
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }),
  icon: style("pagination-link-size-icon", {
    height: "2.25rem",
    width: "2.25rem",
  }),
  "icon-xs": style("pagination-link-size-icon-xs", {
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("pagination-link-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
  "icon-lg": style("pagination-link-size-icon-lg", {
    height: "2.5rem",
    width: "2.5rem",
  }),
};

export const previous = style("pagination-previous", {
  gap: "0.25rem",
  paddingInline: "0.625rem",
  "@media (min-width: 40rem)": {
    "&": {
      paddingLeft: "0.625rem",
    },
  },
});

export const next = style("pagination-next", {
  gap: "0.25rem",
  paddingInline: "0.625rem",
  "@media (min-width: 40rem)": {
    "&": {
      paddingRight: "0.625rem",
    },
  },
});

export const hiddenUntilSm = style("pagination-hidden-until-sm", {
  display: "none",
  "@media (min-width: 40rem)": {
    "&": {
      display: "block",
    },
  },
});

export const srOnly = style("pagination-sr-only", {
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

export const ellipsis = style("pagination-ellipsis", {
  alignItems: "center",
  display: "flex",
  height: "2.25rem",
  justifyContent: "center",
  width: "2.25rem",
  "& svg": {
    height: "1rem",
    width: "1rem",
  },
});
