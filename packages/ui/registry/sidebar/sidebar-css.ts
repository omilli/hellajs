import { css, keyframes, style, vars } from "@hellajs/css";

vars({
  sidebar: "oklch(0.985 0 0)",
  "sidebar-foreground": "oklch(0.145 0 0)",
  "sidebar-primary": "oklch(0.205 0 0)",
  "sidebar-primary-foreground": "oklch(0.985 0 0)",
  "sidebar-accent": "oklch(0.97 0 0)",
  "sidebar-accent-foreground": "oklch(0.205 0 0)",
  "sidebar-border": "oklch(0.922 0 0)",
  "sidebar-ring": "oklch(0.708 0 0)",
});

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const slideInLeft = keyframes({ from: { opacity: "0", transform: "translateX(-100%)" } });
const slideOutLeft = keyframes({ to: { opacity: "0", transform: "translateX(-100%)" } });
const slideInRight = keyframes({ from: { opacity: "0", transform: "translateX(100%)" } });
const slideOutRight = keyframes({ to: { opacity: "0", transform: "translateX(100%)" } });
const tooltipInRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });

export const base = style({
  display: "flex",
  minHeight: "100svh",
  width: "100%",
}, { label: "sidebar-base" });

export const sidebar = style({
  color: "var(--sidebar-foreground)",
  display: "none",
  "@media (min-width: 48rem)": {
    "&": {
      display: "block",
    },
  },
}, { label: "sidebar" });

export const none = style({
  background: "var(--sidebar)",
  color: "var(--sidebar-foreground)",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "var(--sidebar-width)",
}, { label: "sidebar-none" });

export const gap = style({
  background: "transparent",
  position: "relative",
  transition: "width 200ms linear",
  width: "var(--sidebar-width)",
}, { label: "sidebar-gap" });

export const gapPlain = "";

export const gapInset = "";

export const container = style({
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
}, { label: "sidebar-container" });

export const containerSides = {
  left: style({
    left: "0",
  }, { label: "sidebar-container-left" }),
  right: style({
    right: "0",
  }, { label: "sidebar-container-right" }),
};

export const containerPlain = "";

export const containerInset = "";

export const inner = style({
  background: "var(--sidebar)",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
}, { label: "sidebar-inner" });

export const overlay = style({
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
}, { label: "sidebar-overlay" });

export const mobile = style({
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
}, { label: "sidebar-mobile" });

export const mobileSides = {
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
  }, { label: "sidebar-mobile-left" }),
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
  }, { label: "sidebar-mobile-right" }),
};

export const mobileInner = style({
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
}, { label: "sidebar-mobile-inner" });

export const trigger = style({
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
}, { label: "sidebar-trigger" });

export const rail = style({
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
}, { label: "sidebar-rail" });

export const inset = style({
  background: "var(--background)",
  display: "flex",
  flex: "1",
  flexDirection: "column",
  position: "relative",
  width: "100%",
}, { label: "sidebar-inset" });

export const inputBase = style({
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
}, { label: "sidebar-input-base" });

export const inputFocus = style({
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "sidebar-input-focus" });

export const inputInvalid = style({
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "sidebar-input-invalid" });

export const input = style({
  background: "var(--background)",
  boxShadow: "none",
  height: "2rem",
  width: "100%",
}, { label: "sidebar-input" });

export const header = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  padding: "0.5rem",
}, { label: "sidebar-header" });

export const footer = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  padding: "0.5rem",
}, { label: "sidebar-footer" });

export const separatorBase = style({
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
}, { label: "sidebar-separator-base" });

export const separator = style({
  background: "var(--sidebar-border)",
  marginInline: "0.5rem",
  width: "auto",
}, { label: "sidebar-separator" });

export const content = style({
  display: "flex",
  flex: "1",
  flexDirection: "column",
  gap: "0.5rem",
  minHeight: "0",
  overflow: "auto",
}, { label: "sidebar-content" });

export const group = style({
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  padding: "0.5rem",
  position: "relative",
  width: "100%",
}, { label: "sidebar-group" });

export const groupLabel = style({
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
}, { label: "sidebar-group-label" });

export const groupAction = style({
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
  "&::after": {
    inset: "-0.5rem",
    position: "absolute",
  },
  "@media (min-width: 48rem)": {
    "&::after": {
      content: "none",
    },
  },
}, { label: "sidebar-group-action" });

export const groupContent = style({
  fontSize: "0.875rem",
  width: "100%",
}, { label: "sidebar-group-content" });

export const menu = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  minWidth: "0",
  width: "100%",
}, { label: "sidebar-menu" });

export const menuItem = style({
  position: "relative",
}, { label: "sidebar-menu-item" });

export const menuButton = style({
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
}, { label: "sidebar-menu-button" });

export const menuButtonVariants = {
  default: "",
  outline: style({
    background: "var(--background)",
    boxShadow: "0 0 0 1px var(--sidebar-border)",
    "&:hover": {
      backgroundColor: "var(--sidebar-accent)",
      boxShadow: "0 0 0 1px var(--sidebar-accent)",
      color: "var(--sidebar-accent-foreground)",
    },
  }, { label: "sidebar-menu-button-outline" }),
};

export const menuButtonSizes = {
  default: style({
    fontSize: "0.875rem",
    height: "2rem",
  }, { label: "sidebar-menu-button-default" }),
  sm: style({
    fontSize: "0.75rem",
    height: "1.75rem",
  }, { label: "sidebar-menu-button-sm" }),
  lg: style({
    fontSize: "0.875rem",
    height: "3rem",
  }, { label: "sidebar-menu-button-lg" }),
};

export const menuAction = style({
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
  "&::after": {
    inset: "-0.5rem",
    position: "absolute",
  },
  "@media (min-width: 48rem)": {
    "&::after": {
      content: "none",
    },
  },
}, { label: "sidebar-menu-action" });

export const menuActionHover = "";

export const menuBadge = style({
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
}, { label: "sidebar-menu-badge" });

export const menuSkeleton = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "flex",
  gap: "0.5rem",
  height: "2rem",
  paddingInline: "0.5rem",
}, { label: "sidebar-menu-skeleton" });

const pulse = keyframes({
  "50%": { opacity: "0.5" },
});

export const skeletonBase = style({
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
  backgroundColor: "var(--accent)",
  borderRadius: "calc(var(--radius) * 0.8)",
}, { label: "sidebar-skeleton" });

export const skeletonIcon = style({
  borderRadius: "calc(var(--radius) * 0.8)",
  height: "1rem",
  width: "1rem",
}, { label: "sidebar-skeleton-icon" });

export const skeletonText = style({
  flex: "1",
  height: "1rem",
  maxWidth: "var(--skeleton-width)",
}, { label: "sidebar-skeleton-text" });

export const menuSub = style({
  borderLeft: "1px solid var(--sidebar-border)",
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  marginInline: "0.875rem",
  minWidth: "0",
  paddingBlock: "0.125rem",
  paddingInline: "0.625rem",
  translate: "1px",
}, { label: "sidebar-menu-sub" });

export const menuSubItem = style({
  position: "relative",
}, { label: "sidebar-menu-sub-item" });

export const menuSubButton = style({
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
}, { label: "sidebar-menu-sub-button" });

export const menuSubSizes = {
  sm: style({
    fontSize: "0.75rem",
    lineHeight: "1rem",
  }, { label: "sidebar-menu-sub-sm" }),
  md: style({
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  }, { label: "sidebar-menu-sub-md" }),
};

export const tooltipContent = style({
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
}, { label: "sidebar-tooltip-content" });

css({
  "[data-slot='sidebar-wrapper']:has([data-variant='inset'])": {
    background: "var(--sidebar)",
  },

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

  "[data-variant='floating'] [data-slot='sidebar-inner']": {
    border: "1px solid var(--sidebar-border)",
    borderRadius: "0.5rem",
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  },

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

  "[data-collapsible='icon'] [data-slot='sidebar-content']": {
    overflow: "hidden",
  },

  "[data-collapsible='icon'] [data-slot='sidebar-group-label']": {
    marginTop: "-2rem",
    opacity: "0",
  },
  "[data-collapsible='icon'] [data-slot='sidebar-group-action']": {
    display: "none",
  },

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

  "[data-slot='sidebar-menu-item']:focus-within [data-sidebar='menu-action'][data-show-on-hover='true'], [data-slot='sidebar-menu-item']:hover [data-sidebar='menu-action'][data-show-on-hover='true']": {
    opacity: "1",
  },
  "[data-sidebar='menu-button'][data-active='true'] ~ [data-sidebar='menu-action'][data-show-on-hover='true']": {
    color: "var(--sidebar-accent-foreground)",
  },
  "[data-sidebar='menu-action'][data-show-on-hover='true'][data-state='open']": {
    opacity: "1",
  },

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

  "[data-collapsible='icon'] [data-slot='sidebar-menu-sub']": {
    display: "none",
  },
  "[data-collapsible='icon'] [data-sidebar='menu-sub-button']": {
    display: "none",
  },
});

css({
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
});
