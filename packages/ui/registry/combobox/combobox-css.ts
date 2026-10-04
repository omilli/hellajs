import { css, keyframes, style } from "@hellajs/css";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style({
  alignItems: "center",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  height: "2.25rem",
  minWidth: "0",
  outlineStyle: "none",
  position: "relative",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
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
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:has([data-slot][aria-invalid='true'])": {
    borderColor: "var(--destructive)",
  },
  "&:has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *):has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "combobox-wrapper" });

export const input = style({
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
}, { label: "combobox-input" });

export const inputFocus = style({
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "combobox-input-focus" });

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
}, { label: "combobox-input-invalid" });

export const inputControl = style({
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
}, { label: "combobox-input-control" });

export const addon = style({
  alignItems: "center",
  color: "var(--muted-foreground)",
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
    borderRadius: "calc(var(--radius) - 5px)",
  },
  "& > svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&[data-disabled='true']": {
    opacity: "0.5",
  },
}, { label: "combobox-addon" });

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
}, { label: "combobox-button" });

export const buttonGhost = style({
  "&:hover": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:is(.dark *):hover": {
    backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
  },
}, { label: "combobox-button-ghost" });

export const buttonSizeIconXs = style({
  borderRadius: "calc(var(--radius) * 0.8)",
  height: "1.5rem",
  width: "1.5rem",
  "& svg:not([class*='size-'])": {
    height: "0.75rem",
    width: "0.75rem",
  },
}, { label: "combobox-button-size-icon-xs" });

export const sizeIconXs = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) - 5px)",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  height: "1.5rem",
  padding: "0",
  boxShadow: "none",
  "&:has(> svg)": {
    padding: "0",
  },
}, { label: "combobox-size-icon-xs" });

export const triggerExtra = style({
  "&[data-pressed]": {
    backgroundColor: "transparent",
  },
}, { label: "combobox-trigger-extra" });

export const chipRemoveExtra = style({
  marginLeft: "-0.25rem",
  opacity: "0.5",
  "&:hover": {
    opacity: "1",
  },
}, { label: "combobox-chip-remove-extra" });

export const trigger = style({
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "combobox-trigger" });

export const triggerIcon = style({
  color: "var(--muted-foreground)",
  height: "1rem",
  pointerEvents: "none",
  width: "1rem",
}, { label: "combobox-trigger-icon" });

export const content = style({
  backgroundColor: "var(--popover)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1), 0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent)",
  color: "var(--popover-foreground)",
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
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
    borderColor: "color-mix(in oklab, var(--input) 30%, transparent)",
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
}, { label: "combobox-content" });

export const list = style({
  maxHeight: "min(calc(24rem - 2.25rem), calc(var(--available-height) - 2.25rem))",
  overflowY: "auto",
  padding: "0.25rem",
  scrollPaddingBlock: "0.25rem",
  "&[data-empty]": {
    padding: "0",
  },
}, { label: "combobox-list" });

export const item = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
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
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
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
}, { label: "combobox-item" });

export const itemIndicator = style({
  alignItems: "center",
  display: "flex",
  height: "1rem",
  justifyContent: "center",
  pointerEvents: "none",
  position: "absolute",
  right: "0.5rem",
  width: "1rem",
}, { label: "combobox-item-indicator" });

export const icon = style({
  height: "1rem",
  pointerEvents: "none",
  width: "1rem",
  "@media (pointer: coarse)": {
    "&": {
      height: "1.25rem",
      width: "1.25rem",
    },
  },
}, { label: "combobox-icon" });

export const xIcon = style({
  pointerEvents: "none",
}, { label: "combobox-x-icon" });

export const label = style({
  color: "var(--muted-foreground)",
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
}, { label: "combobox-label" });

export const empty = style({
  color: "var(--muted-foreground)",
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
}, { label: "combobox-empty" });

export const separator = style({
  backgroundColor: "var(--border)",
  height: "1px",
  marginBlock: "0.25rem",
  marginInline: "-0.25rem",
}, { label: "combobox-separator" });

export const chips = style({
  alignItems: "center",
  backgroundClip: "padding-box",
  backgroundColor: "transparent",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
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
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:has([aria-invalid='true'])": {
    borderColor: "var(--destructive)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:has([data-slot='combobox-chip'])": {
    paddingInline: "0.375rem",
  },
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:is(.dark *):has([aria-invalid='true'])": {
    borderColor: "color-mix(in oklab, var(--destructive) 50%, transparent)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "combobox-chips" });

export const chip = style({
  alignItems: "center",
  backgroundColor: "var(--muted)",
  borderRadius: "calc(var(--radius) * 0.6)",
  color: "var(--foreground)",
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
}, { label: "combobox-chip" });

export const chipsInput = style({
  flex: "1 1 0%",
  minWidth: "4rem",
  outlineStyle: "none",
}, { label: "combobox-chips-input" });

css({
  "[data-slot='input-group']:has([data-slot='combobox-clear']) [data-slot='combobox-trigger']": {
    display: "none",
  },
});
