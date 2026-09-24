import { keyframes, style } from "@hellajs/css";

// tw-animate-css equivalents, hand-rolled: fade in/out for the overlay,
// fade+zoom(95%) composed into the panel's enter/exit keyframes.
const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style({
  backgroundColor: "var(--popover)",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "var(--popover-foreground)",
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
  width: "100%",
}, { label: "hella-command", layer: "hella" });

export const inputWrapper = style({
  alignItems: "center",
  borderBottom: "1px solid var(--border)",
  display: "flex",
  gap: "0.5rem",
  height: "2.25rem",
  paddingInline: "0.75rem",
}, { label: "hella-command-input-wrapper", layer: "hella" });

export const icon = style({
  flexShrink: "0",
  height: "1rem",
  opacity: "0.5",
  width: "1rem",
}, { label: "hella-command-icon", layer: "hella" });

export const input = style({
  backgroundColor: "transparent",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "flex",
  fontSize: "0.875rem",
  height: "2.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.75rem",
  width: "100%",
  "&::placeholder": {
    color: "var(--muted-foreground)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
}, { label: "hella-command-input", layer: "hella" });

export const list = style({
  maxHeight: "300px",
  overflowX: "hidden",
  overflowY: "auto",
  scrollPaddingBlock: "0.25rem",
}, { label: "hella-command-list", layer: "hella" });

export const empty = style({
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  paddingBlock: "1.5rem",
  textAlign: "center",
}, { label: "hella-command-empty", layer: "hella" });

export const group = style({
  color: "var(--foreground)",
  overflow: "hidden",
  padding: "0.25rem",
  "& [data-slot='command-group-heading']": {
    color: "var(--muted-foreground)",
    fontSize: "0.75rem",
    fontWeight: "500",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    paddingBlock: "0.375rem",
  },
}, { label: "hella-command-group", layer: "hella" });

export const groupHeading = style({
  color: "var(--muted-foreground)",
  fontSize: "0.75rem",
  fontWeight: "500",
  lineHeight: "1rem",
  paddingInline: "0.5rem",
  paddingBlock: "0.375rem",
}, { label: "hella-command-group-heading", layer: "hella" });

export const separator = style({
  backgroundColor: "var(--border)",
  height: "1px",
  marginInline: "-0.25rem",
}, { label: "hella-command-separator", layer: "hella" });

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
  paddingInline: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&[data-disabled='true']": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-selected='true']": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: "var(--muted-foreground)",
  },
}, { label: "hella-command-item", layer: "hella" });

export const shortcut = style({
  color: "var(--muted-foreground)",
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
}, { label: "hella-command-shortcut", layer: "hella" });

// The palette scoping the CommandDialog root applies: the copied
// `[&_[cmdk-*]]` overrides translated against this entry's data-slots,
// registered after the part maps so equal-specificity overrides resolve.
export const palette = style({
  "& [data-slot='command-input-wrapper']": {
    height: "3rem",
  },
  "& [data-slot='command-input-wrapper'] svg": {
    height: "1.25rem",
    width: "1.25rem",
  },
  "& [data-slot='command-input']": {
    height: "3rem",
  },
  "& [data-slot='command-group']": {
    paddingInline: "0.5rem",
  },
  "& [data-slot='command-group']:not([hidden]) ~ [data-slot='command-group']": {
    paddingTop: "0",
  },
  "& [data-slot='command-group-heading']": {
    color: "var(--muted-foreground)",
    fontWeight: "500",
    paddingInline: "0.5rem",
  },
  "& [data-slot='command-item']": {
    paddingBlock: "0.75rem",
    paddingInline: "0.5rem",
  },
  "& [data-slot='command-item'] svg": {
    height: "1.25rem",
    width: "1.25rem",
  },
}, { label: "hella-command-palette", layer: "hella" });

// The composed Dialog surface, duplicated inline under this entry (registry
// entries never cross-import): overlay, panel (the ref's overflow-hidden p-0
// override composed in), sr-only header, title, description, and close.
export const dialogOverlay = style({
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
}, { label: "hella-command-dialog-overlay", layer: "hella" });

export const dialogPanel = style({
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "grid",
  gap: "1rem",
  left: "50%",
  maxWidth: "calc(100% - 2rem)",
  outlineStyle: "none",
  overflow: "hidden",
  padding: "0",
  position: "fixed",
  top: "50%",
  translate: "-50% -50%",
  width: "100%",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${zoomIn} 200ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${zoomOut} 200ms ease-in both`,
  },
  "@media (min-width: 40rem)": {
    "&": {
      maxWidth: "32rem",
    },
  },
}, { label: "hella-command-dialog-panel", layer: "hella" });

export const dialogHeader = style({
  clip: "rect(0, 0, 0, 0)",
  borderWidth: "0",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
}, { label: "hella-command-dialog-header", layer: "hella" });

export const dialogTitle = style({
  fontSize: "1.125rem",
  fontWeight: "600",
  lineHeight: "1",
}, { label: "hella-command-dialog-title", layer: "hella" });

export const dialogDescription = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
}, { label: "hella-command-dialog-description", layer: "hella" });

export const dialogClose = style({
  borderRadius: "calc(var(--radius) * 0.2)",
  opacity: "0.7",
  position: "absolute",
  right: "1rem",
  top: "1rem",
  transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    opacity: "1",
  },
  "&:focus": {
    boxShadow: "0 0 0 2px var(--background), 0 0 0 4px var(--ring)",
    outlineStyle: "none",
  },
  "&:disabled": {
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: "var(--accent)",
    color: "var(--muted-foreground)",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  // The copied `sr-only` span labeling the close button.
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
}, { label: "hella-command-dialog-close", layer: "hella" });
