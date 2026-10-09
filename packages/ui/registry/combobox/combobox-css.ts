import { css, keyframes, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style("combobox-wrapper", {
  alignItems: "center",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  height: "2.25rem",
  minWidth: "0",
  outlineStyle: "none",
  position: "relative",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&:is(.dark *)": {
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:has(> textarea)": {
    height: "auto",
  },
  "&:has(> [data-align='inline-start']) > input": {
    paddingLeft: "0.5rem",
  },
  "&:has(> [data-align='inline-end']) > input": {
    paddingRight: "0.5rem",
  },
  "&:has([data-slot='input-group-control']:focus-visible)": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:has([data-slot][aria-invalid='true'])": {
    borderColor: tokens.destructive,
  },
  "&:has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *):has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

export const input = style("combobox-input", {
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

export const inputFocus = style("combobox-input-focus", {
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
});

export const inputInvalid = style("combobox-input-invalid", {
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

export const inputControl = style("combobox-input-control", {
  background: "transparent",
  borderRadius: "0",
  borderWidth: "0",
  flex: "1 1 0%",
  boxShadow: "none",
  "&:focus-visible": {
    boxShadow: "none",
  },
  "&:is(.dark *)": {
    background: "transparent",
  },
});

export const addon = style("combobox-addon", {
  alignItems: "center",
  color: tokens.mutedForeground,
  cursor: "text",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "auto",
  justifyContent: "center",
  order: "9999",
  paddingBlock: "0.375rem",
  paddingRight: "0.75rem",
  userSelect: "none",
  "&:has(> button)": {
    marginRight: "-0.45rem",
  },
  "&:has(> kbd)": {
    marginRight: "-0.35rem",
  },
  "& > kbd": {
    borderRadius: `calc(${tokens.radius} - 5px)`,
  },
  "& > svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&[data-disabled='true']": {
    opacity: "0.5",
  },
});

export const buttonBase = style("combobox-button", {
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

export const buttonGhost = style("combobox-button-ghost", {
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *):hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
  },
});

export const buttonSizeIconXs = style("combobox-button-size-icon-xs", {
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  height: "1.5rem",
  width: "1.5rem",
  "& svg:not([class*='size-'])": {
    height: "0.75rem",
    width: "0.75rem",
  },
});

export const sizeIconXs = style("combobox-size-icon-xs", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} - 5px)`,
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  height: "1.5rem",
  padding: "0",
  boxShadow: "none",
  "&:has(> svg)": {
    padding: "0",
  },
});

export const triggerExtra = style("combobox-trigger-extra", {
  "&[data-pressed]": {
    backgroundColor: "transparent",
  },
});

export const chipRemoveExtra = style("combobox-chip-remove-extra", {
  marginLeft: "-0.25rem",
  opacity: "0.5",
  "&:hover": {
    opacity: "1",
  },
});

export const trigger = style("combobox-trigger", {
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
});

export const triggerIcon = style("combobox-trigger-icon", {
  color: tokens.mutedForeground,
  height: "1rem",
  pointerEvents: "none",
  width: "1rem",
});

export const content = style("combobox-content", {
  backgroundColor: tokens.popover,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1), 0 0 0 1px color-mix(in oklab, ${tokens.foreground} 10%, transparent)`,
  color: tokens.popoverForeground,
  maxHeight: "24rem",
  maxWidth: "var(--available-width)",
  minWidth: "calc(var(--anchor-width) + 1.75rem)",
  overflow: "hidden",
  position: "relative",
  transformOrigin: "var(--transform-origin)",
  transitionDuration: "100ms",
  width: "var(--anchor-width)",
  "&[data-chips='true']": {
    minWidth: "var(--anchor-width)",
  },
  "& > [data-slot='input-group']": {
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    borderColor: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    boxShadow: "none",
    height: "2rem",
    margin: "0.25rem",
    marginBottom: "0",
  },
  "&[data-side='bottom']": {
    translate: "0 0.25rem",
  },
  "&[data-side='left']": {
    translate: "-0.25rem 0",
  },
  "&[data-side='right']": {
    translate: "0.25rem 0",
  },
  "&[data-side='top']": {
    translate: "0 -0.25rem",
  },
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 100ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 100ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 100ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 100ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 100ms ease-in both`,
  },
});

export const list = style("combobox-list", {
  maxHeight: "min(calc(24rem - 2.25rem), calc(var(--available-height) - 2.25rem))",
  overflowY: "auto",
  padding: "0.25rem",
  scrollPaddingBlock: "0.25rem",
  "&[data-empty]": {
    padding: "0",
  },
});

export const item = style("combobox-item", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.375rem",
  paddingLeft: "0.5rem",
  paddingRight: "2rem",
  position: "relative",
  userSelect: "none",
  width: "100%",
  "&[data-highlighted]": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
});

export const itemIndicator = style("combobox-item-indicator", {
  alignItems: "center",
  display: "flex",
  height: "1rem",
  justifyContent: "center",
  pointerEvents: "none",
  position: "absolute",
  right: "0.5rem",
  width: "1rem",
});

export const icon = style("combobox-icon", {
  height: "1rem",
  pointerEvents: "none",
  width: "1rem",
  "@media (pointer: coarse)": {
    "&": {
      height: "1.25rem",
      width: "1.25rem",
    },
  },
});

export const xIcon = style("combobox-x-icon", {
  pointerEvents: "none",
});

export const label = style("combobox-label", {
  color: tokens.mutedForeground,
  fontSize: "0.75rem",
  lineHeight: "1rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "@media (pointer: coarse)": {
    "&": {
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
      paddingBlock: "0.5rem",
      paddingInline: "0.75rem",
    },
  },
});

export const empty = style("combobox-empty", {
  color: tokens.mutedForeground,
  display: "none",
  fontSize: "0.875rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  paddingBlock: "0.5rem",
  textAlign: "center",
  width: "100%",
  "&:is([data-slot='combobox-content'][data-empty] *)": {
    display: "flex",
  },
});

export const separator = style("combobox-separator", {
  backgroundColor: tokens.border,
  height: "1px",
  marginBlock: "0.25rem",
  marginInline: "-0.25rem",
});

export const chips = style("combobox-chips", {
  alignItems: "center",
  backgroundClip: "padding-box",
  backgroundColor: "transparent",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.875rem",
  gap: "0.375rem",
  lineHeight: "1.25rem",
  minHeight: "2.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.625rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:focus-within": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:has([aria-invalid='true'])": {
    borderColor: tokens.destructive,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:has([data-slot='combobox-chip'])": {
    paddingInline: "0.375rem",
  },
  "&:is(.dark *)": {
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:is(.dark *):has([aria-invalid='true'])": {
    borderColor: `color-mix(in oklab, ${tokens.destructive} 50%, transparent)`,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

export const chip = style("combobox-chip", {
  alignItems: "center",
  backgroundColor: tokens.muted,
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  color: tokens.foreground,
  display: "flex",
  fontSize: "0.75rem",
  fontWeight: "500",
  gap: "0.25rem",
  height: "1.375rem",
  justifyContent: "center",
  paddingInline: "0.375rem",
  whiteSpace: "nowrap",
  width: "fit-content",
  "&:has(:disabled)": {
    cursor: "not-allowed",
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:has([data-slot='combobox-chip-remove'])": {
    paddingRight: "0",
  },
});

export const chipsInput = style("combobox-chips-input", {
  flex: "1 1 0%",
  minWidth: "4rem",
  outlineStyle: "none",
});

css({
  "[data-slot='input-group']:has([data-slot='combobox-clear']) [data-slot='combobox-trigger']": {
    display: "none",
  },
});
