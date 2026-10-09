import { effect, signal } from "@hellajs/core";
import { anchorPosition, hoverIntent, onEscape, onOutside, Portal, trapFocus } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";

import { css, keyframes, style, vars } from "@hellajs/css";
import { tokens } from "./tokens.js";

const sidebarTokens = vars({
  sidebar: "oklch(0.985 0 0)",
  sidebarForeground: "oklch(0.145 0 0)",
  sidebarPrimary: "oklch(0.205 0 0)",
  sidebarPrimaryForeground: "oklch(0.985 0 0)",
  sidebarAccent: "oklch(0.97 0 0)",
  sidebarAccentForeground: "oklch(0.205 0 0)",
  sidebarBorder: "oklch(0.922 0 0)",
  sidebarRing: "oklch(0.708 0 0)",
});

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const slideInLeft = keyframes({ from: { opacity: "0", transform: "translateX(-100%)" } });
const slideOutLeft = keyframes({ to: { opacity: "0", transform: "translateX(-100%)" } });
const slideInRight = keyframes({ from: { opacity: "0", transform: "translateX(100%)" } });
const slideOutRight = keyframes({ to: { opacity: "0", transform: "translateX(100%)" } });
const tooltipInRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });

const base = style("sidebar-base", {
  display: "flex",
  minHeight: "100svh",
  width: "100%",
});

const sidebar = style("sidebar", {
  color: sidebarTokens.sidebarForeground,
  display: "none",
  "@media (min-width: 48rem)": {
    "&": {
      display: "block",
    },
  },
});

const none = style("sidebar-none", {
  background: sidebarTokens.sidebar,
  color: sidebarTokens.sidebarForeground,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "var(--sidebar-width)",
});

const gap = style("sidebar-gap", {
  background: "transparent",
  position: "relative",
  transition: "width 200ms linear",
  width: "var(--sidebar-width)",
});

const gapPlain = "";

const gapInset = "";

const container = style("sidebar-container", {
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
});

const containerSides = {
  left: style("sidebar-container-left", {
    left: "0",
  }),
  right: style("sidebar-container-right", {
    right: "0",
  }),
};

const containerPlain = "";

const containerInset = "";

const inner = style("sidebar-inner", {
  background: sidebarTokens.sidebar,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
});

const overlay = style("sidebar-overlay", {
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

const mobile = style("sidebar-mobile", {
  background: sidebarTokens.sidebar,
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  color: sidebarTokens.sidebarForeground,
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
});

const mobileSides = {
  left: style("sidebar-mobile-left", {
    borderRight: `1px solid ${tokens.border}`,
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
  }),
  right: style("sidebar-mobile-right", {
    borderLeft: `1px solid ${tokens.border}`,
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
  }),
};

const mobileInner = style("sidebar-mobile-inner", {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  width: "100%",
});

const trigger = style("sidebar-trigger", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *):hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
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
});

const rail = style("sidebar-rail", {
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
});

const inset = style("sidebar-inset", {
  background: tokens.background,
  display: "flex",
  flex: "1",
  flexDirection: "column",
  position: "relative",
  width: "100%",
});

const inputBase = style("sidebar-input-base", {
  background: "transparent",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    color: tokens.foreground,
    display: "inline-flex",
    fontSize: "0.875rem",
    fontWeight: "500",
    height: "1.75rem",
  },
  "&::placeholder": {
    color: tokens.mutedForeground,
  },
  "&::selection": {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
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
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
});

const inputFocus = style("sidebar-input-focus", {
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
});

const inputInvalid = style("sidebar-input-invalid", {
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

const input = style("sidebar-input", {
  background: tokens.background,
  boxShadow: "none",
  height: "2rem",
  width: "100%",
});

const header = style("sidebar-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  padding: "0.5rem",
});

const footer = style("sidebar-footer", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  padding: "0.5rem",
});

const separatorBase = style("sidebar-separator-base", {
  backgroundColor: tokens.border,
  flexShrink: "0",
  "&[data-orientation='horizontal']": {
    height: "1px",
    width: "100%",
  },
  "&[data-orientation='vertical']": {
    height: "100%",
    width: "1px",
  },
});

const separator = style("sidebar-separator", {
  background: sidebarTokens.sidebarBorder,
  marginInline: "0.5rem",
  width: "auto",
});

const content = style("sidebar-content", {
  display: "flex",
  flex: "1",
  flexDirection: "column",
  gap: "0.5rem",
  minHeight: "0",
  overflow: "auto",
});

const group = style("sidebar-group", {
  display: "flex",
  flexDirection: "column",
  minWidth: "0",
  padding: "0.5rem",
  position: "relative",
  width: "100%",
});

const groupLabel = style("sidebar-group-label", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: `color-mix(in oklab, ${sidebarTokens.sidebarForeground} 70%, transparent)`,
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
    boxShadow: `0 0 0 2px ${sidebarTokens.sidebarRing}`,
  },
});

const groupAction = style("sidebar-group-action", {
  alignItems: "center",
  aspectRatio: "1 / 1",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: sidebarTokens.sidebarForeground,
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
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 2px ${sidebarTokens.sidebarRing}`,
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
});

const groupContent = style("sidebar-group-content", {
  fontSize: "0.875rem",
  width: "100%",
});

const menu = style("sidebar-menu", {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  minWidth: "0",
  width: "100%",
});

const menuItem = style("sidebar-menu-item", {
  position: "relative",
});

const menuButton = style("sidebar-menu-button", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
  },
  "&:active": {
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 2px ${sidebarTokens.sidebarRing}`,
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
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
    fontWeight: "500",
  },
  "&[data-state='open']:hover": {
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
  },
});

const menuButtonVariants = {
  default: "",
  outline: style("sidebar-menu-button-outline", {
    background: tokens.background,
    boxShadow: `0 0 0 1px ${sidebarTokens.sidebarBorder}`,
    "&:hover": {
      backgroundColor: sidebarTokens.sidebarAccent,
      boxShadow: `0 0 0 1px ${sidebarTokens.sidebarAccent}`,
      color: sidebarTokens.sidebarAccentForeground,
    },
  }),
};

const menuButtonSizes = {
  default: style("sidebar-menu-button-default", {
    fontSize: "0.875rem",
    height: "2rem",
  }),
  sm: style("sidebar-menu-button-sm", {
    fontSize: "0.75rem",
    height: "1.75rem",
  }),
  lg: style("sidebar-menu-button-lg", {
    fontSize: "0.875rem",
    height: "3rem",
  }),
};

const menuAction = style("sidebar-menu-action", {
  alignItems: "center",
  aspectRatio: "1 / 1",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: sidebarTokens.sidebarForeground,
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
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 2px ${sidebarTokens.sidebarRing}`,
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
});

const menuActionHover = "";

const menuBadge = style("sidebar-menu-badge", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: sidebarTokens.sidebarForeground,
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
});

const menuSkeleton = style("sidebar-menu-skeleton", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  display: "flex",
  gap: "0.5rem",
  height: "2rem",
  paddingInline: "0.5rem",
});

const pulse = keyframes({
  "50%": { opacity: "0.5" },
});

const skeletonBase = style("sidebar-skeleton", {
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
  backgroundColor: tokens.accent,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
});

const skeletonIcon = style("sidebar-skeleton-icon", {
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  height: "1rem",
  width: "1rem",
});

const skeletonText = style("sidebar-skeleton-text", {
  flex: "1",
  height: "1rem",
  maxWidth: "var(--skeleton-width)",
});

const menuSub = style("sidebar-menu-sub", {
  borderLeft: `1px solid ${sidebarTokens.sidebarBorder}`,
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  marginInline: "0.875rem",
  minWidth: "0",
  paddingBlock: "0.125rem",
  paddingInline: "0.625rem",
  translate: "1px",
});

const menuSubItem = style("sidebar-menu-sub-item", {
  position: "relative",
});

const menuSubButton = style("sidebar-menu-sub-button", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: sidebarTokens.sidebarForeground,
  display: "flex",
  gap: "0.5rem",
  height: "1.75rem",
  minWidth: "0",
  outlineStyle: "none",
  overflow: "hidden",
  paddingInline: "0.5rem",
  translate: "-1px",
  "& svg": {
    color: sidebarTokens.sidebarAccentForeground,
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
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
  },
  "&:active": {
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 2px ${sidebarTokens.sidebarRing}`,
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
    backgroundColor: sidebarTokens.sidebarAccent,
    color: sidebarTokens.sidebarAccentForeground,
  },
});

const menuSubSizes = {
  sm: style("sidebar-menu-sub-sm", {
    fontSize: "0.75rem",
    lineHeight: "1rem",
  }),
  md: style("sidebar-menu-sub-md", {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  }),
};

const tooltipContent = style("sidebar-tooltip-content", {
  backgroundColor: tokens.foreground,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: tokens.background,
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
});

css({
  "[data-slot='sidebar-wrapper']:has([data-variant='inset'])": {
    background: sidebarTokens.sidebar,
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
    borderRight: `1px solid ${tokens.border}`,
  },
  "[data-side='right'][data-variant='sidebar'] [data-slot='sidebar-container']": {
    borderLeft: `1px solid ${tokens.border}`,
  },
  "[data-variant='floating'] [data-slot='sidebar-container'], [data-variant='inset'] [data-slot='sidebar-container']": {
    padding: "0.5rem",
  },

  "[data-variant='floating'] [data-slot='sidebar-inner']": {
    border: `1px solid ${sidebarTokens.sidebarBorder}`,
    borderRadius: "0.5rem",
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  },

  "@media (min-width: 48rem)": {
    "[data-slot='sidebar'][data-variant='inset'] ~ [data-slot='sidebar-inset']": {
      borderRadius: `calc(${tokens.radius} * 1.4)`,
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
    background: sidebarTokens.sidebar,
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
    color: sidebarTokens.sidebarAccentForeground,
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
    color: sidebarTokens.sidebarAccentForeground,
  },
  "[data-sidebar='menu-action'][data-show-on-hover='true'][data-state='open']": {
    opacity: "1",
  },

  "[data-sidebar='menu-button']:hover ~ [data-slot='sidebar-menu-badge']": {
    color: sidebarTokens.sidebarAccentForeground,
  },
  "[data-sidebar='menu-button'][data-active='true'] ~ [data-slot='sidebar-menu-badge']": {
    color: sidebarTokens.sidebarAccentForeground,
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

interface SidebarProviderProps extends HTMLAttributes<"div"> {
  /** Controlled open state. When given, the provider never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (state: SidebarState) => HellaChildren;
  class?: string;
}

export function SidebarProvider({ open: openProp, defaultOpen, onOpenChange, children, class: cls, ...attrs }: SidebarProviderProps): JSX.Element {
  const internal = signal(defaultOpen ?? true);
  // Two separate states the ref also splits: the viewport query and the
  // mobile sheet's own open flag - conflating them would flip the branch
  // back to desktop on sheet close.
  const viewport = signal(false);
  const sheetOpen = signal(false);
  const open = (): boolean => (openProp !== undefined ? openProp() : internal());
  const setOpen = (next: boolean): void => {
    if (openProp === undefined) internal(next);
    onOpenChange?.(next);
  };
  const openMobile = (): boolean => sheetOpen();
  const setOpenMobile = (next: boolean): void => {
    sheetOpen(next);
  };
  const isMobile = (): boolean => viewport();
  const onToggle = (): void => (isMobile() ? setOpenMobile(!openMobile()) : setOpen(!open()));
  const teardown: (() => void)[] = [];

  return (
    <div
      data-slot="sidebar-wrapper"
      style="--sidebar-width: 16rem; --sidebar-width-icon: 3rem"
      class={
        [base, cls]
      }
      hook:afterMount={() => {
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
      }}
      hook:beforeDestroy={() => {
        while (teardown.length) teardown.pop()!();
      }}
      {...attrs}
    >
      {children({ open, setOpen, mobile: isMobile, openMobile, setOpenMobile, onToggle })}
    </div>
  );
}

/** Side the desktop panel hugs. */
type SidebarSide = "left" | "right";

type SidebarVariant = "sidebar" | "floating" | "inset";

type SidebarCollapsible = "offcanvas" | "icon" | "none";

interface SidebarProps extends HTMLAttributes<"div"> {
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

export function Sidebar({ open, mobile: mobileProp, openMobile, onOpenMobileChange, side: sideProp, variant: variantProp, collapsible: collapsibleProp, class: cls, children, ...attrs }: SidebarProps): JSX.Element {
  const side = sideProp ?? "left";
  const variant = variantProp ?? "sidebar";
  const collapsible = collapsibleProp ?? "offcanvas";
  const collapsed = (): boolean => open !== undefined && open() === false;
  const variantIsInset = variant === "floating" || variant === "inset";

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        class={
          [none, cls]
        }
        {...attrs}
      >
        {children}
      </div>
    );
  }

  // The mobile/desktop fork is a reactive branch - reading mobile() in an
  // early return would bake the branch at first evaluation and the
  // provider's matchMedia flip would never propagate.
  return (
    <>
      {() => mobileProp?.() === true ? (
        <SidebarMobileSheet
          open={() => openMobile?.() ?? false}
          onClose={() => onOpenMobileChange?.(false)}
          side={side}
          children={flattenChildren(children)}
        />
      ) : (
        <div
          data-slot="sidebar"
          data-state={collapsed() ? "collapsed" : "expanded"}
          data-collapsible={collapsed() ? collapsible : undefined}
          data-variant={variant}
          data-side={side}
          class={
            [sidebar]
          }
          {...attrs}
        >
          {/* This is what handles the sidebar gap on desktop */}
          <div
            data-slot="sidebar-gap"
            class={
              [gap, variantIsInset ? gapInset : gapPlain]
            }
          />
          <div
            data-slot="sidebar-container"
            class={
              [container, containerSides[side], variantIsInset ? containerInset : containerPlain, cls]
            }
          >
            <div
              data-sidebar="sidebar"
              data-slot="sidebar-inner"
              class={
                [inner]
              }
            >
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
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
 * escape/outside/trap wiring, exit hold) are duplicated inline.
 */
function SidebarMobileSheet(props: SidebarMobileSheetProps): JSX.Element {
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

  return (
    <>
      {() => visible() && (
        <Portal to="body">
          <div
            data-slot="sidebar-overlay"
            data-state={state()}
            class={
              [overlay]
            }
          />
          <div
            data-sidebar="sidebar"
            data-slot="sidebar"
            data-mobile="true"
            data-state={state()}
            data-side={side}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            style="--sidebar-width: 18rem"
            class={
              [mobile, mobileSides[side]]
            }
            hook:afterMount={(node) => {
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
            }}
            hook:beforeDestroy={() => {
              disposeWirings();
              while (teardown.length) teardown.pop()!();
            }}
          >
            <h2 id={titleId} class="sr-only">Sidebar</h2>
            <p id={descriptionId} class="sr-only">Displays the mobile sidebar.</p>
            <div
              class={
                [mobileInner]
              }
            >
              {props.children}
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

interface SidebarTriggerProps extends HTMLAttributes<"button"> {
  onToggle?: () => void;
  class?: string;
}

export function SidebarTrigger({ onToggle, "on:click": userClick, class: cls, ...attrs }: SidebarTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      class={
        [trigger, cls]
      }
      on:click={function (e) {
        userClick?.call(this, e);
        onToggle?.();
      }}
      {...attrs}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect width="18" height="18" x="3" y="3" rx="2" />
        <path d="M9 3v18" />
      </svg>
      <span class="sr-only">Toggle Sidebar</span>
    </button>
  );
}

interface SidebarRailProps extends HTMLAttributes<"button"> {
  onToggle?: () => void;
  class?: string;
  children?: HellaChildren;
}

/** The drag-handle edge - click toggles; width dragging is out of scope (bounded open). */
export function SidebarRail({ onToggle, "on:click": userClick, class: cls, children, ...attrs }: SidebarRailProps): JSX.Element {
  return (
    <button
      type="button"
      data-sidebar="rail"
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      title="Toggle Sidebar"
      tabIndex={-1}
      class={
        [rail, cls]
      }
      on:click={function (e) {
        userClick?.call(this, e);
        onToggle?.();
      }}
      {...attrs}
    >
      {children}
    </button>
  );
}

interface SidebarPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export function SidebarInset({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <main
      data-slot="sidebar-inset"
      class={
        [inset, cls]
      }
      {...attrs}
    >
      {children}
    </main>
  );
}

interface SidebarInputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export function SidebarInput({ class: cls, ...attrs }: SidebarInputProps): JSX.Element {
  return (
    <input
      data-sidebar="input"
      data-slot="sidebar-input"
      class={
        [inputBase, inputFocus, inputInvalid, input, cls]
      }
      {...attrs}
    />
  );
}

export function SidebarHeader({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      class={
        [header, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      class={
        [footer, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function SidebarSeparator({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-separator"
      data-sidebar="separator"
      role="separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class={
        [separatorBase, separator, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function SidebarContent({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      class={
        [content, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function SidebarGroup({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      class={
        [group, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function SidebarGroupLabel({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-group-label"
      data-sidebar="group-label"
      class={
        [groupLabel, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface SidebarGroupActionProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
}

export function SidebarGroupAction({ children, class: cls, ...attrs }: SidebarGroupActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="sidebar-group-action"
      data-sidebar="group-action"
      class={
        [groupAction, cls]
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

export function SidebarGroupContent({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      class={
        [groupContent, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function SidebarMenu({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      class={
        [menu, cls]
      }
      {...attrs}
    >
      {children}
    </ul>
  );
}

export function SidebarMenuItem({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <li
      data-slot="sidebar-menu-item"
      data-sidebar="menu-item"
      class={
        [menuItem, cls]
      }
      {...attrs}
    >
      {children}
    </li>
  );
}

interface SidebarMenuButtonProps extends HTMLAttributes<"button"> {
  active?: boolean;
  /** Tooltip label shown while the sidebar is collapsed to icon mode (hover). */
  tooltip?: HellaChildren;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  /** Desktop open accessor threaded from SidebarProvider; the tooltip hides while expanded. */
  open?: () => boolean;
  /** Mobile viewport accessor threaded from SidebarProvider; the tooltip never shows on mobile. */
  mobile?: () => boolean;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuButton({ active, tooltip: tooltipProp, variant: variantProp, size: sizeProp, open, mobile: mobileProp, disabled, class: cls, children, ...attrs }: SidebarMenuButtonProps): JSX.Element {
  const variant = variantProp ?? "default";
  const size = sizeProp ?? "default";

  const button = (
    <button
      type="button"
      data-sidebar="menu-button"
      data-slot="sidebar-menu-button"
      data-size={size}
      data-active={active ? "true" : undefined}
      disabled={disabled as boolean | undefined}
      class={
        [menuButton, menuButtonVariants[variant], menuButtonSizes[size], cls]
      }
      {...attrs}
    >
      {children}
    </button>
  );

  if (tooltipProp === undefined) return button;

  // The ref composes its tooltip entry around the button in icon mode; this
  // entry is self-contained, so the hover wiring (delay 0) is duplicated inline.
  const tooltipId = `hella-sidebar-tooltip-${++sidebarCount}`;
  const tooltipOpen = signal(false);
  const hidden = (): boolean => open === undefined || open() || (mobileProp?.() ?? false);
  const disposals: (() => void)[] = [];
  let triggerNode: Element | undefined;

  return (
    <span
      data-slot="sidebar-menu-tooltip"
      aria-describedby={tooltipId}
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        triggerNode = node;
        // hoverIntent stays armed for the trigger's lifetime - reopen works
        // without a remount (the skip-delay window is the primitive's global).
        disposals.push(hoverIntent(node, {
          onOpen: () => tooltipOpen(true),
          onClose: () => tooltipOpen(false),
          openDelay: 0,
        }));
      }}
      hook:beforeDestroy={() => {
        while (disposals.length) disposals.pop()!();
      }}
    >
      {button}
      {() => tooltipOpen() && (
        <Portal to="body">
          <div
            role="tooltip"
            id={tooltipId}
            data-slot="sidebar-tooltip-content"
            data-state={tooltipOpen() ? "open" : "closed"}
            data-side="right"
            data-align="center"
            hidden={hidden() ? "" : undefined}
            class={
              [tooltipContent]
            }
            hook:afterMount={(node) => {
              if (!(node instanceof HTMLElement) || triggerNode === undefined) return;
              const anchor = triggerNode;
              disposals.push(anchorPosition(anchor, node, { placement: "right" }));
            }}
          >
            {tooltipProp}
          </div>
        </Portal>
      )}
    </span>
  );
}

interface SidebarMenuActionProps extends HTMLAttributes<"button"> {
  showOnHover?: boolean;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuAction({ showOnHover, children, class: cls, ...attrs }: SidebarMenuActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      data-show-on-hover={showOnHover ? "true" : undefined}
      class={
        [menuAction, showOnHover ? menuActionHover : "", cls]
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

export function SidebarMenuBadge({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <div
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      class={
        [menuBadge, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface SidebarMenuSkeletonProps extends HTMLAttributes<"div"> {
  showIcon?: boolean;
  class?: string;
}

export function SidebarMenuSkeleton({ showIcon, class: cls, ...attrs }: SidebarMenuSkeletonProps): JSX.Element {
  // Random width between 50 to 90%, fixed per call.
  const width = `${Math.floor(Math.random() * 40) + 50}%`;

  return (
    <div
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      class={
        [menuSkeleton, cls]
      }
      {...attrs}
    >
      {showIcon === true && (
        <div
          data-sidebar="menu-skeleton-icon"
          class={
            [skeletonBase, skeletonIcon]
          }
        />
      )}
      <div
        data-sidebar="menu-skeleton-text"
        style={`--skeleton-width: ${width}`}
        class={
          [skeletonBase, skeletonText]
        }
      />
    </div>
  );
}

export function SidebarMenuSub({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <ul
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      class={
        [menuSub, cls]
      }
      {...attrs}
    >
      {children}
    </ul>
  );
}

export function SidebarMenuSubItem({ children, class: cls, ...attrs }: SidebarPartProps): JSX.Element {
  return (
    <li
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      class={
        [menuSubItem, cls]
      }
      {...attrs}
    >
      {children}
    </li>
  );
}

interface SidebarMenuSubButtonProps extends HTMLAttributes<"a"> {
  size?: "sm" | "md";
  active?: boolean;
  class?: string;
  children?: HellaChildren;
}

export function SidebarMenuSubButton({ size: sizeProp, active, class: cls, children, ...attrs }: SidebarMenuSubButtonProps): JSX.Element {
  const size = sizeProp ?? "md";

  return (
    <a
      data-sidebar="menu-sub-button"
      data-slot="sidebar-menu-sub-button"
      data-size={size}
      data-active={active ? "true" : undefined}
      class={
        [menuSubButton, menuSubSizes[size], cls]
      }
      {...attrs}
    >
      {children}
    </a>
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
