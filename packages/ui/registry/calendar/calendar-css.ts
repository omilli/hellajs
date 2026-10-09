import { css, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("calendar", {
  backgroundColor: tokens.background,
  padding: "0.75rem",
  width: "fit-content",
  "--cell-size": "2rem",
});

export const months = style("calendar-months", {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  position: "relative",
  "@media (min-width: 48rem)": {
    flexDirection: "row",
  },
});

export const month = style("calendar-month", {
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  width: "100%",
});

export const monthCaption = style("calendar-caption", {
  alignItems: "center",
  display: "flex",
  height: "var(--cell-size)",
  justifyContent: "center",
  paddingInline: "var(--cell-size)",
  width: "100%",
});

export const captionLabel = style("calendar-caption-label", {
  fontSize: "0.875rem",
  fontWeight: "500",
  userSelect: "none",
});

export const nav = style("calendar-nav", {
  alignItems: "center",
  display: "flex",
  gap: "0.25rem",
  justifyContent: "space-between",
  left: "0",
  position: "absolute",
  right: "0",
  top: "0",
  width: "100%",
});

/** The ref's nav buttons: ghost icon-class button tokens with the default size tokens pre-merged out against `size-(--cell-size)`/`p-0`. */
export const navButton = style("calendar-nav-button", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "var(--cell-size)",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  padding: "0",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  userSelect: "none",
  whiteSpace: "nowrap",
  width: "var(--cell-size)",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-disabled='true']": {
    opacity: "0.5",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *)": {
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
    "&[aria-invalid='true']:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  },
});

export const icon = style("calendar-icon", {
  height: "1rem",
  width: "1rem",
});

export const monthGrid = style("calendar-grid", {
  borderCollapse: "collapse",
  width: "100%",
});

export const weekdays = style("calendar-weekdays", {
  display: "flex",
});

export const weekday = style("calendar-weekday", {
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: tokens.mutedForeground,
  flex: "1 1 0%",
  fontSize: "0.8rem",
  fontWeight: "400",
  userSelect: "none",
});

export const week = style("calendar-week", {
  display: "flex",
  marginTop: "0.5rem",
  width: "100%",
});

export const day = style("calendar-day", {
  aspectRatio: "1 / 1",
  height: "100%",
  padding: "0",
  position: "relative",
  textAlign: "center",
  userSelect: "none",
  width: "100%",
});

/** The ref's CalendarDayButton: ghost icon-class tokens with the conflicts the ref's `cn()` resolves pre-merged; range/selection state rides the button's own data attributes. */
export const dayButton = style("calendar-day-button", {
  alignItems: "center",
  aspectRatio: "1 / 1",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  color: "inherit",
  display: "flex",
  flexDirection: "column",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "400",
  gap: "0.25rem",
  justifyContent: "center",
  lineHeight: "1",
  minWidth: "var(--cell-size)",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  width: "100%",
  "& > span": {
    fontSize: "0.75rem",
    opacity: "0.7",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
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
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *)": {
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
      color: tokens.accentForeground,
    },
    "&[aria-invalid='true']:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  },
  "&[data-selected-single='true']": {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  "&[data-range-start='true']": {
    backgroundColor: tokens.primary,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.primaryForeground,
  },
  "&[data-range-end='true']": {
    backgroundColor: tokens.primary,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.primaryForeground,
  },
  "&[data-range-middle='true']": {
    backgroundColor: tokens.accent,
    borderRadius: "0",
    color: tokens.accentForeground,
  },
});

css({
  "[data-slot='calendar-day'][data-today='true']": {
    backgroundColor: tokens.accent,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.accentForeground,
  },
  "[data-slot='calendar-day'][data-today='true'][data-selected='true']": {
    borderRadius: "0",
  },
  "[data-slot='calendar-day'][data-outside='true']": {
    color: tokens.mutedForeground,
  },
  "[data-slot='calendar-day'][data-disabled='true']": {
    color: tokens.mutedForeground,
    opacity: "0.5",
  },
  "[data-slot='calendar-day'][data-hidden='true']": {
    visibility: "hidden",
  },
  "[data-slot='calendar-day'][data-range-start='true']": {
    backgroundColor: tokens.accent,
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day'][data-range-middle='true']": {
    borderRadius: "0",
  },
  "[data-slot='calendar-day'][data-range-end='true']": {
    backgroundColor: tokens.accent,
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day']:first-child[data-selected='true'] button": {
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day']:last-child[data-selected='true'] button": {
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='calendar-day'][data-focused='true'] [data-slot='calendar-day-button']": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    position: "relative",
    zIndex: "10",
  },
  "[data-slot='card-content'] [data-slot='calendar']": {
    backgroundColor: "transparent",
  },
  "[data-slot='popover-content'] [data-slot='calendar']": {
    backgroundColor: "transparent",
  },
});
