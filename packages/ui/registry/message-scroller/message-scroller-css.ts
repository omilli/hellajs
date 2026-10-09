import { css, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("message-scroller", {
  position: "relative",
  display: "flex",
  height: "100%",
  width: "100%",
  minHeight: "0",
  flexDirection: "column",
  overflow: "hidden",
});

export const viewport = style("message-scroller-viewport", {
  height: "100%",
  width: "100%",
  minHeight: "0",
  minWidth: "0",
  overflowY: "auto",
  overscrollBehavior: "contain",
  contain: "content",
});

export const content = style("message-scroller-content", {
  display: "flex",
  height: "max-content",
  minHeight: "100%",
  flexDirection: "column",
  gap: "2rem",
});

export const item = style("message-scroller-item", {
  minWidth: "0",
  flexShrink: "0",
  containIntrinsicSize: "auto 10rem",
  contentVisibility: "auto",
});

export const buttonBase = style("message-scroller-button", {
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
  default: style("message-scroller-button-default", {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.primary} 90%, transparent)`,
    },
  }),
  destructive: style("message-scroller-button-destructive", {
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
  outline: style("message-scroller-button-outline", {
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
  secondary: style("message-scroller-button-secondary", {
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.secondary} 80%, transparent)`,
    },
  }),
  ghost: style("message-scroller-button-ghost", {
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
  }),
  link: style("message-scroller-button-link", {
    color: tokens.primary,
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }),
};

export const buttonSizes = {
  default: style("message-scroller-button-size-default", {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }),
  xs: style("message-scroller-button-size-xs", {
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
  sm: style("message-scroller-button-size-sm", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  lg: style("message-scroller-button-size-lg", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }),
  icon: style("message-scroller-button-size-icon", {
    height: "2.25rem",
    width: "2.25rem",
  }),
  "icon-xs": style("message-scroller-button-size-icon-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("message-scroller-button-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
  "icon-lg": style("message-scroller-button-size-icon-lg", {
    height: "2.5rem",
    width: "2.5rem",
  }),
};

export const overlay = style("message-scroller-overlay", {
  position: "absolute",
  insetInlineStart: "50%",
  translate: "-50% 0",
  borderColor: tokens.border,
  backgroundColor: tokens.background,
  color: tokens.foreground,
  transitionProperty: "translate, scale, opacity",
  transitionDuration: "200ms",
  "&:hover": {
    backgroundColor: tokens.muted,
    color: tokens.foreground,
  },
  "&[data-active='false']": {
    pointerEvents: "none",
    scale: "0.95",
    opacity: "0",
    transitionDuration: "400ms",
    transitionTimingFunction: "cubic-bezier(0.7, 0, 0.84, 0)",
  },
  "&[data-active='true']": {
    translate: "-50% 0",
    scale: "1",
    opacity: "1",
    transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
  },
  "&[data-direction='end']": {
    bottom: "1rem",
  },
  "&[data-direction='end'][data-active='false']": {
    translate: "-50% 100%",
  },
  "&[data-direction='start']": {
    top: "1rem",
  },
  "&[data-direction='start'][data-active='false']": {
    translate: "-50% -100%",
  },
});

export const srOnly = style("message-scroller-sr-only", {
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

css({
  "[data-slot='message-scroller-button'][data-direction='start'] svg": {
    transform: "rotate(180deg)",
  },
  "[dir='rtl'] [data-slot='message-scroller-button']": {
    translate: "50% 0",
  },
  "[dir='rtl'] [data-slot='message-scroller-button'][data-direction='end'][data-active='false']": {
    translate: "50% 100%",
  },
  "[dir='rtl'] [data-slot='message-scroller-button'][data-direction='start'][data-active='false']": {
    translate: "50% -100%",
  },
});
