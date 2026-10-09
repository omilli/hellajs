import { keyframes, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style("alert-dialog-base", {
  backgroundColor: "rgb(0 0 0 / 0.5)",
  inset: "0",
  position: "fixed",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${fadeIn} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${fadeOut} 150ms ease-in both`,
  },
});

export const content = style("alert-dialog-content", {
  background: tokens.background,
  border: `1px solid ${tokens.border}`,
  borderRadius: tokens.radius,
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "grid",
  gap: "1rem",
  left: "50%",
  maxWidth: "calc(100% - 2rem)",
  outlineStyle: "none",
  padding: "1.5rem",
  position: "fixed",
  top: "50%",
  translate: "-50% -50%",
  width: "100%",
  zIndex: "50",
  "&[data-size='sm']": {
    maxWidth: "20rem",
  },
  "&[data-state='open']": {
    animation: `${zoomIn} 200ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${zoomOut} 200ms ease-in both`,
  },
  "@media (min-width: 40rem)": {
    "&[data-size='default']": {
      maxWidth: "32rem",
    },
  },
});

export const header = style("alert-dialog-header", {
  display: "grid",
  gap: "0.375rem",
  gridTemplateRows: "auto 1fr",
  placeItems: "center",
  textAlign: "center",
  "&:has([data-slot='alert-dialog-media'])": {
    columnGap: "1.5rem",
    gridTemplateRows: "auto auto 1fr",
  },
  "@media (min-width: 40rem)": {
    "&:is([data-size='default'] *)": {
      placeItems: "start",
      textAlign: "left",
    },
    "&:is([data-size='default']:has([data-slot='alert-dialog-media']) *)": {
      gridTemplateRows: "auto 1fr",
    },
  },
});

export const footer = style("alert-dialog-footer", {
  display: "flex",
  flexDirection: "column-reverse",
  gap: "0.5rem",
  "&:is([data-size='sm'] *)": {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },
  "@media (min-width: 40rem)": {
    "&": {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
  },
});

export const title = style("alert-dialog-title", {
  fontSize: "1.125rem",
  fontWeight: "600",
  "@media (min-width: 40rem)": {
    "&:is([data-size='default']:has([data-slot='alert-dialog-media']) *)": {
      gridColumnStart: "2",
    },
  },
});

export const description = style("alert-dialog-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

export const media = style("alert-dialog-media", {
  alignItems: "center",
  backgroundColor: tokens.muted,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  display: "inline-flex",
  height: "4rem",
  justifyContent: "center",
  marginBottom: "0.5rem",
  width: "4rem",
  "& svg:not([class*='size-'])": {
    height: "2rem",
    width: "2rem",
  },
  "@media (min-width: 40rem)": {
    "&:is([data-size='default'] *)": {
      gridRow: "span 2 / span 2",
    },
  },
});

export const buttonBase = style("alert-dialog-button", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

export const buttonVariants = {
  default: style("alert-dialog-button-default", {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.primary} 90%, transparent)`,
    },
  }),
  destructive: style("alert-dialog-button-destructive", {
    backgroundColor: tokens.destructive,
    color: "#fff",
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 90%, transparent)`,
    },
    "&:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
    },
    "&:is(.dark *)": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 60%, transparent)`,
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  }),
  outline: style("alert-dialog-button-outline", {
    background: tokens.background,
    border: `1px solid ${tokens.border}`,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *)": {
      borderColor: tokens.input,
      background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    },
    "&:is(.dark *):hover": {
      background: `color-mix(in oklab, ${tokens.input} 50%, transparent)`,
    },
  }),
  secondary: style("alert-dialog-button-secondary", {
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.secondary} 80%, transparent)`,
    },
  }),
  ghost: style("alert-dialog-button-ghost", {
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
  }),
  link: style("alert-dialog-button-link", {
    color: tokens.primary,
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }),
};

export const buttonSizes = {
  default: style("alert-dialog-button-size-default", {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }),
  xs: style("alert-dialog-button-size-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
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
  sm: style("alert-dialog-button-size-sm", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  lg: style("alert-dialog-button-size-lg", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }),
  icon: style("alert-dialog-button-size-icon", {
    height: "2.25rem",
    width: "2.25rem",
  }),
  "icon-xs": style("alert-dialog-button-size-icon-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("alert-dialog-button-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
  "icon-lg": style("alert-dialog-button-size-icon-lg", {
    height: "2.5rem",
    width: "2.5rem",
  }),
};
