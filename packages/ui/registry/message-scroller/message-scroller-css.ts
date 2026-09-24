import { css, style } from "@hellajs/css";

export const base = style({
  position: "relative",
  display: "flex",
  height: "100%",
  width: "100%",
  minHeight: "0",
  flexDirection: "column",
  overflow: "hidden",
}, { label: "hella-message-scroller", layer: "hella" });

export const viewport = style({
  height: "100%",
  width: "100%",
  minHeight: "0",
  minWidth: "0",
  overflowY: "auto",
  overscrollBehavior: "contain",
  contain: "content",
}, { label: "hella-message-scroller-viewport", layer: "hella" });

export const content = style({
  display: "flex",
  height: "max-content",
  minHeight: "100%",
  flexDirection: "column",
  gap: "2rem",
}, { label: "hella-message-scroller-content", layer: "hella" });

export const item = style({
  minWidth: "0",
  flexShrink: "0",
  containIntrinsicSize: "auto 10rem",
  contentVisibility: "auto",
}, { label: "hella-message-scroller-item", layer: "hella" });

export const buttonBase = style({
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
}, { label: "hella-message-scroller-button", layer: "hella" });

export const buttonVariants = {
  default: style({
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  }, { label: "hella-message-scroller-button-default", layer: "hella" }),
  destructive: style({
    backgroundColor: "var(--destructive)",
    color: "#fff",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 90%, transparent)",
    },
    "&:focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
    },
    "&:is(.dark *)": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 60%, transparent)",
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
    },
  }, { label: "hella-message-scroller-button-destructive", layer: "hella" }),
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
  }, { label: "hella-message-scroller-button-outline", layer: "hella" }),
  secondary: style({
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
    },
  }, { label: "hella-message-scroller-button-secondary", layer: "hella" }),
  ghost: style({
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }, { label: "hella-message-scroller-button-ghost", layer: "hella" }),
  link: style({
    color: "var(--primary)",
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }, { label: "hella-message-scroller-button-link", layer: "hella" }),
};

export const buttonSizes = {
  default: style({
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }, { label: "hella-message-scroller-button-size-default", layer: "hella" }),
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
  }, { label: "hella-message-scroller-button-size-xs", layer: "hella" }),
  sm: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }, { label: "hella-message-scroller-button-size-sm", layer: "hella" }),
  lg: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }, { label: "hella-message-scroller-button-size-lg", layer: "hella" }),
  icon: style({
    height: "2.25rem",
    width: "2.25rem",
  }, { label: "hella-message-scroller-button-size-icon", layer: "hella" }),
  "icon-xs": style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "hella-message-scroller-button-size-icon-xs", layer: "hella" }),
  "icon-sm": style({
    height: "2rem",
    width: "2rem",
  }, { label: "hella-message-scroller-button-size-icon-sm", layer: "hella" }),
  "icon-lg": style({
    height: "2.5rem",
    width: "2.5rem",
  }, { label: "hella-message-scroller-button-size-icon-lg", layer: "hella" }),
};

export const overlay = style({
  position: "absolute",
  insetInlineStart: "50%",
  translate: "-50% 0",
  borderColor: "var(--border)",
  backgroundColor: "var(--background)",
  color: "var(--foreground)",
  transitionProperty: "translate, scale, opacity",
  transitionDuration: "200ms",
  "&:hover": {
    backgroundColor: "var(--muted)",
    color: "var(--foreground)",
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
}, { label: "hella-message-scroller-overlay", layer: "hella" });

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
}, { label: "hella-message-scroller-sr-only", layer: "hella" });

// Direction/rtl state the button carries itself or from the document root:
// class-scoped nesting cannot restate ancestor conditions self-based, so these
// register as raw attribute selectors in the same layer, after the part classes.
css({
  "@layer hella": {
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
  },
});
