import { effect, signal } from "@hellajs/core";
import { anchorPosition, hoverIntent, html, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

import { css, keyframes, style, vars } from "@hellajs/css";

// The sidebar palette the tailwind flavor reads from theme.css; tokens.js
// carries no sidebar colors, so the css flavor registers them here (same
// values as theme.css, same vars()/`.dark` shape as tokens.js).
vars({
  sidebar: "oklch(0.985 0 0)",
  "sidebar-foreground": "oklch(0.145 0 0)",
  "sidebar-primary": "oklch(0.205 0 0)",
  "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.97 0 0)",
  "sidebar-accent-foreground": "oklch(0.205 0 0)",
  "sidebar-border": "oklch(0.922 0 0)",
  "sidebar-ring": "oklch(0.708 0 0)",
}, { layer: "hella" });

css({
  "@layer hella": {
    ".dark": {
      "--sidebar": "oklch(0.205 0 0)",
      "--sidebar-foreground": "oklch(0.985 0 0)",
      "--sidebar-primary": "oklch(0.488 0.243 264.376)",
      "--sidebar-primary-foreground": "oklch(0.985 0 0)",
      "--sidebar-accent": "oklch(0.269 0 0)",
      "--sidebar-accent-foreground": "oklch(0.985 0 0)",
      "--sidebar-border": "oklch(1 0 0 / 10%)",
      "--sidebar-ring": "oklch(0.556 0 0)",
    },
  },
});

// The `--sidebar-width` (16rem) and `--sidebar-width-icon` (3rem) constants
// live on the provider wrapper's inline style; the mobile sheet overrides
// `--sidebar-width` to 18rem on its panel. Widths are runtime values, not
// palette.

// tw-animate-css equivalents for the mobile sheet, hand-rolled (the sheet
// entry's lexicon): overlay fade plus one slide pair per side.
const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const slideInLeft = keyframes({ from: { opacity: "0", transform: "translateX(-100%)" } });
const slideOutLeft = keyframes({ to: { opacity: "0", transform: "translateX(-100%)" } });
const slideInRight = keyframes({ from: { opacity: "0", transform: "translateX(100%)" } });
const slideOutRight = keyframes({ to: { opacity: "0", transform: "translateX(100%)" } });
// The icon-mode tooltip label: fade composed with the right-side slide-in.
const tooltipInRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });

const base = style({
  display: "flex",
  minHeight: "100svh",
  width: "100%",
}, { label: "hella-sidebar-base", layer: "hella" });

const sidebar = style({
  color: "var(--sidebar-foreground)",
  display: "none",
  "@media (min-width: 48rem)": {
    "&": {
      display: "block",
    },
  },
}, { label: "hella-sidebar", layer: "hella" });

const none = style({
  background: "var(--sidebar)",
  color: "var(--sidebar-foreground)",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "var(--sidebar-width)",
}, { label: "hella-sidebar-none", layer: "hella" });

const gap = style({
  background: "transparent",
  position: "relative",
  transition: "width 200ms linear",
  width: "var(--sidebar-width)",
}, { label: "hella-sidebar-gap", layer: "hella" });

// The icon-mode width forks are ancestor-conditioned (data-collapsible on the
// sidebar root); the rules live in the raw block below, the maps stay empty.
const gapPlain = "";

const gapInset = "";

const container = style({
  display: "none",
  height: "100svh",
  insetBlock: "0",
  position: "fixed",
  transition: "left 200ms linear, right 200ms linear, width 200ms linear",
  width: "var(--sidebar-width)",
  zIndex: "10",
  "@media (min-width: 48rem)": {
    "&": {
      display: "flex",
    },
  },
}, { label: "hella-sidebar-container", layer: "hella" });

const containerSides = {
  left: style({
    left: "0",
  }, { label: "hella-sidebar-container-left", layer: "hella" }),
  right: style({
    right: "0",
  }, { label: "hella-sidebar-container-right", layer: "hella" }),
};

const containerPlain = "";

const containerInset = "";

const inner = style({
  background: "var(--sidebar)",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
}, { label: "hella-sidebar-inner", layer: "hella" });

const overlay = style({
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
}, { label: "hella-sidebar-overlay", layer: "hella" });

const mobile = style({
  background: "var(--sidebar)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  color: "var(--sidebar-foreground)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  padding: "0",
  position: "fixed",
  transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
  zIndex: "50",
  "& > button": {
    display: "none",
  },
  // The sr-only sheet header pair (title + description): tailwind ships the
  // utility, the css flavor carries the same hiding recipe.
  "& h2, & p": {
    clip: "rect(0, 0, 0, 0)",
    borderWidth: "0",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
}, { label: "hella-sidebar-mobile", layer: "hella" });

const mobileSides = {
  left: style({
    borderRight: "1px solid var(--border)",
    bottom: "0",
    height: "100%",
    left: "0",
    top: "0",
    width: "var(--sidebar-width)",
    "&[data-state='open']": {
      animation: `${slideInLeft} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutLeft} 300ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }, { label: "hella-sidebar-mobile-left", layer: "hella" }),
  right: style({
    borderLeft: "1px solid var(--border)",
    bottom: "0",
    height: "100%",
    right: "0",
    top: "0",
    width: "var(--sidebar-width)",
    "&[data-state='open']": {
      animation: `${slideInRight} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutRight} 300ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }, { label: "hella-sidebar-mobile-right", layer: "hella" }),
};

const mobileInner = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
}, { label: "hella-sidebar-mobile-inner", layer: "hella" });

const trigger = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "1.75rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  width: "1.75rem",
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
  "&:hover": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:is(.dark *):hover": {
    backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
  },
  // The copied `sr-only` span: tailwind ships the utility, the css flavor
  // carries the same hiding recipe on the trigger part.
  "& span": {
    clip: "rect(0, 0, 0, 0)",
    borderWidth: "0",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
}, { label: "hella-sidebar-trigger", layer: "hella" });

const rail = style({
  display: "none",
  insetBlock: "0",
  position: "absolute",
  translate: "-50%",
  transition: "all 150ms linear",
  width: "1rem",
  zIndex: "20",
  "&::after": {
    insetBlock: "0",
    left: "50%",
    position: "absolute",
    width: "2px",
  },
  "@media (min-width: 40rem)": {
    "&": {
      display: "flex",
    },
  },
}, { label: "hella-sidebar-rail", layer: "hella" });

const inset = style({
  background: "var(--background)",
  display: "flex",
  flex: "1",
  flexDirection: "column",
  position: "relative",
  width: "100%",
}, { label: "hella-sidebar-inset", layer: "hella" });

const inputBase = style({
  background: "transparent",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  fontSize: "1rem",
  height: "2.25rem",
  lineHeight: "1.5rem",
  minWidth: "0",
  outlineStyle: "none",
  paddingBlock: "0.25rem",
  paddingInline: "0.75rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&::file-selector-button": {
    background: "transparent",
    border: "none",
    color: "var(--foreground)",
    display: "inline-flex",
    fontSize: "0.875rem",
    fontWeight: "500",
    height: "1.75rem",
  },
  "&::placeholder": {
    color: "var(--muted-foreground)",
  },
  "&::selection": {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
    pointerEvents: "none",
  },
  "@media (min-width: 48rem)": {
    "&": {
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
    },
  },
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
}, { label: "hella-sidebar-input-base", layer: "hella" });

const inputFocus = style({
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "hella-sidebar-input-focus", layer: "hella" });

const inputInvalid = style({
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-sidebar-input-invalid", layer: "hella" });

const input = style({
  background: "var(--background)",
  boxShadow: "none",
  height: "2rem",
  width: "100%",
}, { label: "hella-sidebar-input", layer: "hella" });

const header = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  padding: "0.5rem",
}, { label: "hella-sidebar-header", layer: "hella" });

const footer = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  padding: "0.5rem",
}, { label: "hella-sidebar-footer", layer: "hella" });

const separatorBase = style({
  backgroundColor: "var(--border)",
  flexShrink: "0",
  "&[data-orientation='horizontal']": {
    height: "1px",
    width: "100%",
  },
  "&[data-orientation='vertical']": {
    height: "100%",
    width: "1px",
  },
}, { label: "hella-sidebar-separator-base", layer: "hella" });

const separator = style({
  background: "var(--sidebar-border)",
  marginInline: "0.5rem",
  width: "auto",
}, { label: "hella-sidebar-separator", layer: "hella" });

const content = style({
  display: "flex",
  flex: "1",
  flexDirection: "column",
  gap: "0.5rem",
  minHeight: "0",
  overflow: "auto",
}, { label: "hella-sidebar-content", layer: "hella" });

const group = style({
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  padding: "0.5rem",
  position: "relative",
  width: "100%",
}, { label: "hella-sidebar-group", layer: "hella" });

const groupLabel = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "color-mix(in oklab, var(--sidebar-foreground) 70%, transparent)",
  display: "flex",
  flexShrink: "0",
  fontSize: "0.75rem",
  fontWeight: "500",
  height: "2rem",
  lineHeight: "1rem",
  outlineStyle: "none",
  paddingInline: "0.5rem",
  transition: "margin 200ms linear, opacity 200ms linear",
  "& svg": {
    flexShrink: "0",
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 2px var(--sidebar-ring)",
  },
}, { label: "hella-sidebar-group-label", layer: "hella" });

const groupAction = style({
  alignItems: "center",
  aspectRatio: "1 / 1",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "var(--sidebar-foreground)",
  display: "flex",
  justifyContent: "center",
  outlineStyle: "none",
  padding: "0",
  position: "absolute",
  right: "0.75rem",
  top: "0.875rem",
  transition: "transform 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1.25rem",
  "& svg": {
    flexShrink: "0",
    height: "1rem",
    width: "1rem",
  },
  "&:hover": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 2px var(--sidebar-ring)",
  },
  // Increases the hit area of the button on mobile; the md variant drops it.
  "&::after": {
    inset: "-0.5rem",
    position: "absolute",
  },
  "@media (min-width: 48rem)": {
    "&::after": {
      content: "none",
    },
  },
}, { label: "hella-sidebar-group-action", layer: "hella" });

const groupContent = style({
  fontSize: "0.875rem",
  width: "100%",
}, { label: "hella-sidebar-group-content", layer: "hella" });

const menu = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  minWidth: "0",
  width: "100%",
}, { label: "hella-sidebar-menu", layer: "hella" });

const menuItem = style({
  position: "relative",
}, { label: "hella-sidebar-menu-item", layer: "hella" });

const menuButton = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "flex",
  gap: "0.5rem",
  overflow: "hidden",
  outlineStyle: "none",
  padding: "0.5rem",
  textAlign: "left",
  transition: "width 200ms linear, height 200ms linear, padding 200ms linear",
  width: "100%",
  "& svg": {
    flexShrink: "0",
    height: "1rem",
    width: "1rem",
  },
  "& > span:last-child": {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  "&:hover": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
  },
  "&:active": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 2px var(--sidebar-ring)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-disabled='true']": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-active='true']": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
    fontWeight: "500",
  },
  "&[data-state='open']:hover": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
  },
}, { label: "hella-sidebar-menu-button", layer: "hella" });

const menuButtonVariants = {
  default: "",
  outline: style({
    background: "var(--background)",
    boxShadow: "0 0 0 1px var(--sidebar-border)",
    "&:hover": {
      backgroundColor: "var(--sidebar-accent)",
      boxShadow: "0 0 0 1px var(--sidebar-accent)",
      color: "var(--sidebar-accent-foreground)",
    },
  }, { label: "hella-sidebar-menu-button-outline", layer: "hella" }),
};

const menuButtonSizes = {
  default: style({
    fontSize: "0.875rem",
    height: "2rem",
  }, { label: "hella-sidebar-menu-button-default", layer: "hella" }),
  sm: style({
    fontSize: "0.75rem",
    height: "1.75rem",
  }, { label: "hella-sidebar-menu-button-sm", layer: "hella" }),
  lg: style({
    fontSize: "0.875rem",
    height: "3rem",
  }, { label: "hella-sidebar-menu-button-lg", layer: "hella" }),
};

const menuAction = style({
  alignItems: "center",
  aspectRatio: "1 / 1",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "var(--sidebar-foreground)",
  display: "flex",
  justifyContent: "center",
  outlineStyle: "none",
  padding: "0",
  position: "absolute",
  right: "0.25rem",
  top: "0.375rem",
  transition: "transform 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1.25rem",
  "& svg": {
    flexShrink: "0",
    height: "1rem",
    width: "1rem",
  },
  "&:hover": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 2px var(--sidebar-ring)",
  },
  // Increases the hit area of the button on mobile; the md variant drops it.
  "&::after": {
    inset: "-0.5rem",
    position: "absolute",
  },
  "@media (min-width: 48rem)": {
    "&::after": {
      content: "none",
    },
  },
}, { label: "hella-sidebar-menu-action", layer: "hella" });

// The showOnHover rules are ancestor- and media-conditioned (item hover and
// focus-within, the md-only fade); they key on the data-show-on-hover marker
// the canonical emits, in the raw block below.
const menuActionHover = "";

const menuBadge = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "var(--sidebar-foreground)",
  display: "flex",
  fontSize: "0.75rem",
  fontWeight: "500",
  fontVariantNumeric: "tabular-nums",
  height: "1.25rem",
  justifyContent: "center",
  minWidth: "1.25rem",
  paddingInline: "0.25rem",
  pointerEvents: "none",
  position: "absolute",
  right: "0.25rem",
  userSelect: "none",
}, { label: "hella-sidebar-menu-badge", layer: "hella" });

const menuSkeleton = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "flex",
  gap: "0.5rem",
  height: "2rem",
  paddingInline: "0.5rem",
}, { label: "hella-sidebar-menu-skeleton", layer: "hella" });

const pulse = keyframes({
  "50%": { opacity: "0.5" },
});

const skeletonBase = style({
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
  backgroundColor: "var(--accent)",
  borderRadius: "calc(var(--radius) * 0.8)",
}, { label: "hella-sidebar-skeleton", layer: "hella" });

const skeletonIcon = style({
  borderRadius: "calc(var(--radius) * 0.8)",
  height: "1rem",
  width: "1rem",
}, { label: "hella-sidebar-skeleton-icon", layer: "hella" });

const skeletonText = style({
  flex: "1",
  height: "1rem",
  maxWidth: "var(--skeleton-width)",
}, { label: "hella-sidebar-skeleton-text", layer: "hella" });

const menuSub = style({
  borderLeft: "1px solid var(--sidebar-border)",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  marginInline: "0.875rem",
  minWidth: "0",
  paddingBlock: "0.125rem",
  paddingInline: "0.625rem",
  translate: "1px",
}, { label: "hella-sidebar-menu-sub", layer: "hella" });

const menuSubItem = style({
  position: "relative",
}, { label: "hella-sidebar-menu-sub-item", layer: "hella" });

const menuSubButton = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "var(--sidebar-foreground)",
  display: "flex",
  gap: "0.5rem",
  height: "1.75rem",
  minWidth: "0",
  outlineStyle: "none",
  overflow: "hidden",
  paddingInline: "0.5rem",
  translate: "-1px",
  "& svg": {
    color: "var(--sidebar-accent-foreground)",
    flexShrink: "0",
    height: "1rem",
    width: "1rem",
  },
  "& > span:last-child": {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  "&:hover": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
  },
  "&:active": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 2px var(--sidebar-ring)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-disabled='true']": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-active='true']": {
    backgroundColor: "var(--sidebar-accent)",
    color: "var(--sidebar-accent-foreground)",
  },
}, { label: "hella-sidebar-menu-sub-button", layer: "hella" });

const menuSubSizes = {
  sm: style({
    fontSize: "0.75rem",
    lineHeight: "1rem",
  }, { label: "hella-sidebar-menu-sub-sm", layer: "hella" }),
  md: style({
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  }, { label: "hella-sidebar-menu-sub-md", layer: "hella" }),
};

const tooltipContent = style({
  backgroundColor: "var(--foreground)",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "var(--background)",
  fontSize: "0.75rem",
  lineHeight: "1rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.75rem",
  textWrap: "balance",
  transformOrigin: "var(--radix-tooltip-content-transform-origin)",
  width: "fit-content",
  zIndex: "50",
  "&[data-state='open'][data-side='right']": {
    animation: `${tooltipInRight} 150ms ease-out both`,
  },
}, { label: "hella-sidebar-tooltip-content", layer: "hella" });

// Ancestor-, sibling-, and media-conditioned rules (tailwind's group-*/peer-*/
// has-*/arbitrary variants): attribute selectors over the data-* state the
// canonical emits, inside the same hella layer after the style() calls.
css({
  "@layer hella": {
    // wrapper: has-data-[variant=inset]:bg-sidebar
    "[data-slot='sidebar-wrapper']:has([data-variant='inset'])": {
      background: "var(--sidebar)",
    },

    // gap: icon-mode width per variant, offcanvas collapse, side rotation
    "[data-collapsible='icon'][data-variant='sidebar'] [data-slot='sidebar-gap']": {
      width: "var(--sidebar-width-icon)",
    },
    "[data-collapsible='icon'][data-variant='floating'] [data-slot='sidebar-gap'], [data-collapsible='icon'][data-variant='inset'] [data-slot='sidebar-gap']": {
      width: "calc(var(--sidebar-width-icon) + 1rem)",
    },
    "[data-collapsible='offcanvas'] [data-slot='sidebar-gap']": {
      width: "0",
    },
    "[data-side='right'] [data-slot='sidebar-gap']": {
      rotate: "180deg",
    },

    // container: offcanvas side offsets, icon-mode width per variant, side
    // borders, floating/inset padding
    "[data-side='left'][data-collapsible='offcanvas'] [data-slot='sidebar-container']": {
      left: "calc(var(--sidebar-width) * -1)",
    },
    "[data-side='right'][data-collapsible='offcanvas'] [data-slot='sidebar-container']": {
      right: "calc(var(--sidebar-width) * -1)",
    },
    "[data-collapsible='icon'][data-variant='sidebar'] [data-slot='sidebar-container']": {
      width: "var(--sidebar-width-icon)",
    },
    "[data-collapsible='icon'][data-variant='floating'] [data-slot='sidebar-container'], [data-collapsible='icon'][data-variant='inset'] [data-slot='sidebar-container']": {
      width: "calc(var(--sidebar-width-icon) + 1rem + 2px)",
    },
    "[data-side='left'][data-variant='sidebar'] [data-slot='sidebar-container']": {
      borderRight: "1px solid var(--border)",
    },
    "[data-side='right'][data-variant='sidebar'] [data-slot='sidebar-container']": {
      borderLeft: "1px solid var(--border)",
    },
    "[data-variant='floating'] [data-slot='sidebar-container'], [data-variant='inset'] [data-slot='sidebar-container']": {
      padding: "0.5rem",
    },

    // inner: floating variant frame
    "[data-variant='floating'] [data-slot='sidebar-inner']": {
      border: "1px solid var(--sidebar-border)",
      borderRadius: "0.5rem",
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    },

    // inset: md-only peer geometry against the sidebar root; menu action
    // showOnHover: hidden at md unless revealed (one media block)
    "@media (min-width: 48rem)": {
      "[data-slot='sidebar'][data-variant='inset'] ~ [data-slot='sidebar-inset']": {
        borderRadius: "calc(var(--radius) * 1.4)",
        boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        margin: "0.5rem",
        marginLeft: "0",
      },
      "[data-slot='sidebar'][data-variant='inset'][data-state='collapsed'] ~ [data-slot='sidebar-inset']": {
        marginLeft: "0.5rem",
      },
      "[data-sidebar='menu-action'][data-show-on-hover='true']": {
        opacity: "0",
      },
    },

    // rail: side positioning, cursors, offcanvas shifts (the offcanvas
    // cursor overrides land after the side rules by cascade order)
    "[data-side='left'] [data-slot='sidebar-rail']": {
      cursor: "w-resize",
      right: "-1rem",
    },
    "[data-side='right'] [data-slot='sidebar-rail']": {
      cursor: "e-resize",
      left: "0",
    },
    "[data-side='left'][data-state='collapsed'] [data-slot='sidebar-rail']": {
      cursor: "e-resize",
    },
    "[data-side='right'][data-state='collapsed'] [data-slot='sidebar-rail']": {
      cursor: "w-resize",
    },
    "[data-collapsible='offcanvas'] [data-slot='sidebar-rail']": {
      translate: "0",
    },
    "[data-collapsible='offcanvas'] [data-slot='sidebar-rail']::after": {
      left: "100%",
    },
    "[data-collapsible='offcanvas'] [data-slot='sidebar-rail']:hover": {
      background: "var(--sidebar)",
    },
    "[data-side='left'][data-collapsible='offcanvas'] [data-slot='sidebar-rail']": {
      right: "-0.5rem",
    },
    "[data-side='right'][data-collapsible='offcanvas'] [data-slot='sidebar-rail']": {
      left: "-0.5rem",
    },

    // content: icon-mode clipping
    "[data-collapsible='icon'] [data-slot='sidebar-content']": {
      overflow: "hidden",
    },

    // group label/action: icon-mode suppression
    "[data-collapsible='icon'] [data-slot='sidebar-group-label']": {
      marginTop: "-2rem",
      opacity: "0",
    },
    "[data-collapsible='icon'] [data-slot='sidebar-group-action']": {
      display: "none",
    },

    // menu button: icon-mode square, item-has-action padding
    "[data-collapsible='icon'] [data-sidebar='menu-button']": {
      height: "2rem",
      padding: "0.5rem",
      width: "2rem",
    },
    "[data-collapsible='icon'] [data-sidebar='menu-button'][data-size='lg']": {
      padding: "0",
    },
    "[data-slot='sidebar-menu-item']:has([data-sidebar='menu-action']) [data-sidebar='menu-button']": {
      paddingRight: "2rem",
    },

    // menu action: peer-hover color, per-size tops, icon-mode suppression
    "[data-sidebar='menu-button']:hover ~ [data-sidebar='menu-action']": {
      color: "var(--sidebar-accent-foreground)",
    },
    "[data-sidebar='menu-button'][data-size='sm'] ~ [data-sidebar='menu-action']": {
      top: "0.25rem",
    },
    "[data-sidebar='menu-button'][data-size='default'] ~ [data-sidebar='menu-action']": {
      top: "0.375rem",
    },
    "[data-sidebar='menu-button'][data-size='lg'] ~ [data-sidebar='menu-action']": {
      top: "0.625rem",
    },
    "[data-collapsible='icon'] [data-sidebar='menu-action']": {
      display: "none",
    },

    // menu action showOnHover: fade in on item hover/focus-within/open,
    // hidden at md otherwise (keys on the canonical's data-show-on-hover)
    "[data-slot='sidebar-menu-item']:focus-within [data-sidebar='menu-action'][data-show-on-hover='true'], [data-slot='sidebar-menu-item']:hover [data-sidebar='menu-action'][data-show-on-hover='true']": {
      opacity: "1",
    },
    "[data-sidebar='menu-button'][data-active='true'] ~ [data-sidebar='menu-action'][data-show-on-hover='true']": {
      color: "var(--sidebar-accent-foreground)",
    },
    "[data-sidebar='menu-action'][data-show-on-hover='true'][data-state='open']": {
      opacity: "1",
    },

    // menu badge: peer-hover/active color, per-size tops, icon-mode suppression
    "[data-sidebar='menu-button']:hover ~ [data-slot='sidebar-menu-badge']": {
      color: "var(--sidebar-accent-foreground)",
    },
    "[data-sidebar='menu-button'][data-active='true'] ~ [data-slot='sidebar-menu-badge']": {
      color: "var(--sidebar-accent-foreground)",
    },
    "[data-sidebar='menu-button'][data-size='sm'] ~ [data-slot='sidebar-menu-badge']": {
      top: "0.25rem",
    },
    "[data-sidebar='menu-button'][data-size='default'] ~ [data-slot='sidebar-menu-badge']": {
      top: "0.375rem",
    },
    "[data-sidebar='menu-button'][data-size='lg'] ~ [data-slot='sidebar-menu-badge']": {
      top: "0.625rem",
    },
    "[data-collapsible='icon'] [data-slot='sidebar-menu-badge']": {
      display: "none",
    },

    // sub menu: icon-mode suppression
    "[data-collapsible='icon'] [data-slot='sidebar-menu-sub']": {
      display: "none",
    },
    "[data-collapsible='icon'] [data-sidebar='menu-sub-button']": {
      display: "none",
    },
  },
});

/**
 * The state SidebarProvider threads to its children function - hella has no
 * context primitive, so the provider's composition root hands every manual
 * part its accessors (the dual-surface counterpart of the ref's useSidebar).
 */
interface SidebarState {
  /** Desktop expanded state. */
  open: () => boolean;
  /** Desktop open setter (writes the internal signal unless controlled). */
  setOpen: (open: boolean) => void;
  /** Mobile viewport (max-width: 769px). */
  mobile: () => boolean;
  /** Mobile sheet open state. */
  openMobile: () => boolean;
  /** Mobile sheet open setter. */
  setOpenMobile: (open: boolean) => void;
  /** Toggles the mobile sheet on mobile, the desktop open state otherwise. */
  onToggle: () => void;
}

interface SidebarProviderProps {
  /** Controlled open state. When given, the provider never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (state: SidebarState) => HellaChildren;
  class?: string;
}

export function SidebarProvider(props: SidebarProviderProps): HellaNode {
  const internal = signal(props.defaultOpen ?? true);
  // Two separate states the ref also splits: the viewport query and the
  // mobile sheet's own open flag - conflating them would flip the branch
  // back to desktop on sheet close.
  const viewport = signal(false);
  const sheetOpen = signal(false);
  const open = (): boolean => (props.open !== undefined ? props.open() : internal());
  const setOpen = (next: boolean): void => {
    if (props.open === undefined) internal(next);
    props.onOpenChange?.(next);
  };
  const openMobile = (): boolean => sheetOpen();
  const setOpenMobile = (next: boolean): void => {
    sheetOpen(next);
  };
  const mobile = (): boolean => viewport();
  const onToggle = (): void => (mobile() ? setOpenMobile(!openMobile()) : setOpen(!open()));
  const teardown: (() => void)[] = [];

  return html`
    <div
      data-slot="sidebar-wrapper"
      style="--sidebar-width: 16rem; --sidebar-width-icon: 3rem"
      class="${
        [base, props.class]
      }"
      hook:afterMount="${() => {
        // Mobile detection: the ref's use-mobile hook, inlined as a
        // max-width media query listener on the wrapper's mount.
        const query = window.matchMedia("(max-width: 769px)");
        const onMediaChange = (): void => {
          viewport(query.matches);
        };
        query.addEventListener("change", onMediaChange);
        teardown.push(() => query.removeEventListener("change", onMediaChange));
        onMediaChange();
        // Ctrl/Cmd+B toggles the sidebar (the ref's keyboard shortcut).
        const onKeyDown = (event: KeyboardEvent): void => {
          if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
            event.preventDefault();
            onToggle();
          }
        };
        window.addEventListener("keydown", onKeyDown);
        teardown.push(() => window.removeEventListener("keydown", onKeyDown));
      }}"
      hook:beforeDestroy="${() => {
        while (teardown.length) teardown.pop()!();
      }}"
    >${props.children({ open, setOpen, mobile, openMobile, setOpenMobile, onToggle })}</div>
  ` as HellaNode;
}

/** Side the desktop panel hugs. */
type SidebarSide = "left" | "right";

type SidebarVariant = "sidebar" | "floating" | "inset";

type SidebarCollapsible = "offcanvas" | "icon" | "none";

interface SidebarProps {
  /** Desktop expanded accessor threaded from SidebarProvider. */
  open?: () => boolean;
  /** Mobile viewport accessor threaded from SidebarProvider. */
  mobile?: () => boolean;
  /** Mobile sheet open accessor threaded from SidebarProvider. */
  openMobile?: () => boolean;
  /** Mobile sheet open setter threaded from SidebarProvider. */
  onOpenMobileChange?: (open: boolean) => void;
  side?: SidebarSide;
  variant?: SidebarVariant;
  collapsible?: SidebarCollapsible;
  class?: string;
  children?: HellaChildren;
}

let sidebarCount = 0;

export function Sidebar(props: SidebarProps): HellaNode {
  const side = props.side ?? "left";
  const variant = props.variant ?? "sidebar";
  const collapsible = props.collapsible ?? "offcanvas";
  const collapsed = (): boolean => props.open !== undefined && props.open() === false;
  const variantIsInset = variant === "floating" || variant === "inset";

  if (collapsible === "none") {
    return html`
      <div
        data-slot="sidebar"
        class="${
          [none, props.class]
        }"
      >${() => props.children}</div>
    ` as HellaNode;
  }

  // The mobile/desktop fork is a reactive branch - reading mobile() in an
  // early return would bake the branch at first evaluation and the
  // provider's matchMedia flip would never propagate. The mobile arm calls
  // the sheet's gate so the branch resolves to a vnode (or false) in one
  // unwrap - a bare render-fn member would stringify through resolveNode.
  const mobileTree = SidebarMobileSheet({
    open: () => props.openMobile?.() ?? false,
    onClose: () => props.onOpenMobileChange?.(false),
    side,
    children: flattenChildren(props.children),
  });

  return html`
    ${() => props.mobile?.() === true ? mobileTree() : html`
        <div
          data-slot="sidebar"
          data-state="${() => (collapsed() ? "collapsed" : "expanded")}"
          data-collapsible="${() => (collapsed() ? collapsible : undefined)}"
          data-variant="${variant}"
          data-side="${side}"
          class="${
            [sidebar]
          }"
        >
          <div
            data-slot="sidebar-gap"
            class="${
              [gap, variantIsInset ? gapInset : gapPlain]
            }"
          ></div>
          <div
            data-slot="sidebar-container"
            class="${
              [container, containerSides[side], variantIsInset ? containerInset : containerPlain, props.class]
            }"
          >
            <div
              data-sidebar="sidebar"
              data-slot="sidebar-inner"
              class="${
                [inner]
              }"
            >${() => props.children}</div>
          </div>
        </div>
      ` as HellaChild}
  ` as HellaNode;
}

interface SidebarMobileSheetProps {
  open: () => boolean;
  onClose: () => void;
  side: SidebarSide;
  children?: HellaChildren;
}

/**
 * The mobile panel: the ref renders Sidebar inside its Sheet entry; this
 * entry is self-contained, so the sheet mechanics (overlay, slide pair,
 * escape/outside/trap wiring, exit hold) are duplicated inline. Returns the
 * visible gate thunk - calling it yields the portaled pair or false.
 */
function SidebarMobileSheet(props: SidebarMobileSheetProps): () => HellaChild {
  const side = props.side;
  const titleId = `hella-sidebar-title-${++sidebarCount}`;
  const descriptionId = `hella-sidebar-description-${sidebarCount}`;
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading open() in the template
  // would flash the subtree away one evaluation early).
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];
  let panel: HTMLElement | undefined;

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  const installWirings = (): void => {
    if (panel === undefined || wirings.length > 0 || props.open() === false) return;
    const target = panel;
    wirings.push(onEscape(target, props.onClose));
    wirings.push(onOutside(() => [target], props.onClose));
    wirings.push(trapFocus(target));
  };

  const finishExit = (): void => {
    if (fallback !== undefined) {
      clearTimeout(fallback);
      fallback = undefined;
    }
    visible(false);
  };

  // Flip to open renders immediately; flip to closed starts the exit - the
  // panel stays mounted under data-state="closed" until its animationend
  // (or the copied 350ms budget) unmounts it.
  effect(() => {
    if (props.open()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 350);
    }
  });

  // The exit runs unwired: flipping closed tears the trap/escape/outside
  // handlers down immediately; reopening re-arms them without a remount.
  effect(() => {
    if (props.open() === false) disposeWirings();
    else installWirings();
  });

  const state = (): "open" | "closed" => (props.open() ? "open" : "closed");

  return (): HellaChild => visible() && Portal({
    to: "body",
    children: [
      html`
        <div
          data-slot="sidebar-overlay"
          data-state="${state}"
          class="${
            [overlay]
          }"
        ></div>
      ` as HellaChild,
      html`
          <div
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            data-state="${state}"
            data-side="${side}"
            role="dialog"
            aria-modal="true"
            aria-labelledby="${titleId}"
            aria-describedby="${descriptionId}"
            style="--sidebar-width: 18rem"
            class="${
              [mobile, mobileSides[side]]
            }"
            hook:afterMount="${(node: Element) => {
              if (!(node instanceof HTMLElement)) return;
              panel = node;
              installWirings();
              // The exit's animationend (state already "closed") is the
              // primary unmount trigger; the entry's is ignored.
              const onAnimationEnd = (): void => {
                if (props.open() === false) finishExit();
              };
              node.addEventListener("animationend", onAnimationEnd);
              teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
            }}"
            hook:beforeDestroy="${() => {
              disposeWirings();
              while (teardown.length) teardown.pop()!();
            }}"
          >
            <h2 id="${titleId}" class="sr-only">Sidebar</h2>
            <p id="${descriptionId}" class="sr-only">Displays the mobile sidebar.</p>
            <div
              class="${
                [mobileInner]
              }"
            >${() => props.children}</div>
          </div>
        ` as HellaChild,
    ],
  });
}

interface SidebarTriggerProps {
  onclick?: () => void;
  onToggle?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarTrigger(props: SidebarTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      class="${
        [trigger, props.class]
      }"
      e:click="${() => {
        props.onclick?.();
        props.onToggle?.();
      }}"
    ><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M9 3v18"></path></svg><span class="sr-only">Toggle Sidebar</span></button>
  ` as HellaNode;
}

interface SidebarRailProps {
  onToggle?: () => void;
  class?: string;
  children?: HellaChildren;
}

/** The drag-handle edge - click toggles; width dragging is out of scope (bounded open). */
export function SidebarRail(props: SidebarRailProps): HellaNode {
  return html`
    <button
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      title="Toggle Sidebar"
      tabindex="-1"
      class="${
        [rail, props.class]
      }"
      e:click="${() => props.onToggle?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface SidebarPartProps {
  children?: HellaChildren;
  class?: string;
}

export function SidebarInset(props: SidebarPartProps): HellaNode {
  return html`
    <main
      data-slot="sidebar-inset"
      class="${
        [inset, props.class]
      }"
    >${() => props.children}</main>
  ` as HellaNode;
}

interface SidebarInputProps {
  value?: string | (() => string);
  type?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

export function SidebarInput(props: SidebarInputProps): HellaNode {
  return html`
    <input
      data-sidebar="input"
      data-slot="sidebar-input"
      type="${props.type}"
      placeholder="${props.placeholder}"
      id="${props.id}"
      aria-label="${props.ariaLabel}"
      aria-invalid="${props.ariaInvalid ? "true" : undefined}"
      value="${props.value}"
      class="${
        [inputBase, inputFocus, inputInvalid, input, props.class]
      }"
      on:input="${(e: Event) => props.oninput?.((e.target as HTMLInputElement).value)}"
    ></input>
  ` as HellaNode;
}

export function SidebarHeader(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      class="${
        [header, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarFooter(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      class="${
        [footer, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarSeparator(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-separator"
      data-sidebar="separator"
      role="separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class="${
        [separatorBase, separator, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarContent(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      class="${
        [content, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarGroup(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      class="${
        [group, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarGroupLabel(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      class="${
        [groupLabel, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface SidebarGroupActionProps {
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarGroupAction(props: SidebarGroupActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      class="${
        [groupAction, props.class]
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

export function SidebarGroupContent(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      class="${
        [groupContent, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function SidebarMenu(props: SidebarPartProps): HellaNode {
  return html`
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      class="${
        [menu, props.class]
      }"
    >${() => props.children}</ul>
  ` as HellaNode;
}

export function SidebarMenuItem(props: SidebarPartProps): HellaNode {
  return html`
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      class="${
        [menuItem, props.class]
      }"
    >${() => props.children}</li>
  ` as HellaNode;
}

interface SidebarMenuButtonProps {
  active?: boolean;
  /** Tooltip label shown while the sidebar is collapsed to icon mode (hover). */
  tooltip?: HellaChildren;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  /** Desktop open accessor threaded from SidebarProvider; the tooltip hides while expanded. */
  open?: () => boolean;
  /** Mobile viewport accessor threaded from SidebarProvider; the tooltip never shows on mobile. */
  mobile?: () => boolean;
  type?: string;
  disabled?: boolean;
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuButton(props: SidebarMenuButtonProps): HellaNode {
  const variant = props.variant ?? "default";
  const size = props.size ?? "default";

  const button = html`
    <button
      type="${props.type ?? "button"}"
      data-sidebar="menu-button"
      data-slot="sidebar-menu-button"
      data-size="${size}"
      data-active="${props.active ? "true" : undefined}"
      disabled="${props.disabled}"
      class="${
        [menuButton, menuButtonVariants[variant], menuButtonSizes[size], props.class]
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</button>
  ` as HellaNode;

  if (props.tooltip === undefined) return button;

  // The ref composes its tooltip entry around the button in icon mode; this
  // entry is self-contained, so the hover wiring (delay 0) is duplicated inline.
  const tooltipId = `hella-sidebar-tooltip-${++sidebarCount}`;
  const tooltipOpen = signal(false);
  const hidden = (): boolean => props.open === undefined || props.open() || (props.mobile?.() ?? false);
  const disposals: (() => void)[] = [];
  let triggerNode: Element | undefined;

  return html`
    <span
      data-slot="sidebar-menu-tooltip"
      aria-describedby="${tooltipId}"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        triggerNode = node;
        // hoverIntent stays armed for the trigger's lifetime - reopen works
        // without a remount (the skip-delay window is the primitive's global).
        disposals.push(hoverIntent(node, {
          onOpen: () => tooltipOpen(true),
          onClose: () => tooltipOpen(false),
          openDelay: 0,
        }));
      }}"
      hook:beforeDestroy="${() => {
        while (disposals.length) disposals.pop()!();
      }}"
    >${button}${() => tooltipOpen() && Portal({
      to: "body",
      children: [
        html`
          <div
            role="tooltip"
            id="${tooltipId}"
            data-slot="sidebar-tooltip-content"
            data-state="${() => (tooltipOpen() ? "open" : "closed")}"
            data-side="right"
            data-align="center"
            hidden="${() => (hidden() ? "" : undefined)}"
            class="${
              [tooltipContent]
            }"
            hook:afterMount="${(node: Element) => {
              if (!(node instanceof HTMLElement) || triggerNode === undefined) return;
              const anchor = triggerNode;
              disposals.push(anchorPosition(anchor, node, { placement: "right" }));
            }}"
          >${() => props.tooltip}</div>
        ` as HellaChild,
      ],
    })}</span>
  ` as HellaNode;
}

interface SidebarMenuActionProps {
  showOnHover?: boolean;
  onclick?: () => void;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuAction(props: SidebarMenuActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      data-show-on-hover="${props.showOnHover ? "true" : undefined}"
      class="${
        [menuAction, props.showOnHover ? menuActionHover : "", props.class]
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

export function SidebarMenuBadge(props: SidebarPartProps): HellaNode {
  return html`
    <div
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      class="${
        [menuBadge, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface SidebarMenuSkeletonProps {
  showIcon?: boolean;
  class?: string;
}

export function SidebarMenuSkeleton(props: SidebarMenuSkeletonProps): HellaNode {
  // Random width between 50 to 90%, fixed per call.
  const width = `${Math.floor(Math.random() * 40) + 50}%`;

  return html`
    <div
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      class="${
        [menuSkeleton, props.class]
      }"
    >
      ${() => props.showIcon === true && html`
        <div
          data-sidebar="menu-skeleton-icon"
          class="${
            [skeletonBase, skeletonIcon]
          }"
        ></div>
      ` as HellaChild}
      <div
        data-sidebar="menu-skeleton-text"
        style="--skeleton-width: ${width}"
        class="${
          [skeletonBase, skeletonText]
        }"
      ></div>
    </div>
  ` as HellaNode;
}

export function SidebarMenuSub(props: SidebarPartProps): HellaNode {
  return html`
    <ul
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      class="${
        [menuSub, props.class]
      }"
    >${() => props.children}</ul>
  ` as HellaNode;
}

export function SidebarMenuSubItem(props: SidebarPartProps): HellaNode {
  return html`
    <li
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      class="${
        [menuSubItem, props.class]
      }"
    >${() => props.children}</li>
  ` as HellaNode;
}

interface SidebarMenuSubButtonProps {
  size?: "sm" | "md";
  active?: boolean;
  href?: string;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuSubButton(props: SidebarMenuSubButtonProps): HellaNode {
  const size = props.size ?? "md";

  return html`
    <a
      href="${props.href}"
      data-sidebar="menu-sub-button"
      data-slot="sidebar-menu-sub-button"
      data-size="${size}"
      data-active="${props.active ? "true" : undefined}"
      class="${
        [menuSubButton, menuSubSizes[size], props.class]
      }"
    >${() => props.children}</a>
  ` as HellaNode;
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
