import { css, style } from "@hellajs/css";

export const base = style({
  display: "flex",
  gap: "0.5rem",
  "&[data-orientation='horizontal']": {
    flexDirection: "column",
  },
}, { label: "hella-tabs", layer: "hella" });

export const list = style({
  alignItems: "center",
  borderRadius: "var(--radius)",
  color: "var(--muted-foreground)",
  display: "inline-flex",
  height: "2.25rem",
  justifyContent: "center",
  padding: "3px",
  width: "fit-content",
  "&[data-orientation='vertical']": {
    flexDirection: "column",
    height: "fit-content",
  },
  "&[data-variant='line']": {
    borderRadius: "0",
  },
}, { label: "hella-tabs-list", layer: "hella" });

export const variants = {
  default: style({
    backgroundColor: "var(--muted)",
  }, { label: "hella-tabs-list-default", layer: "hella" }),
  line: style({
    background: "transparent",
    gap: "0.25rem",
  }, { label: "hella-tabs-list-line", layer: "hella" }),
};

export const trigger = style({
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "color-mix(in oklab, var(--foreground) 60%, transparent)",
  display: "inline-flex",
  flex: "1",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.375rem",
  height: "calc(100% - 1px)",
  justifyContent: "center",
  lineHeight: "1.25rem",
  paddingBlock: "0.25rem",
  paddingInline: "0.5rem",
  position: "relative",
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
  "&:hover": {
    color: "var(--foreground)",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    outline: "1px solid var(--ring)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:is(.dark *)": {
    color: "var(--muted-foreground)",
  },
  "&:is(.dark *):hover": {
    color: "var(--foreground)",
  },
  "&[data-state='active']": {
    backgroundColor: "var(--background)",
    color: "var(--foreground)",
  },
  "&:is(.dark *)[data-state='active']": {
    backgroundColor: "color-mix(in oklab, var(--input) 30%, transparent)",
    borderColor: "var(--input)",
    color: "var(--foreground)",
  },
  "&::after": {
    content: "",
    backgroundColor: "var(--foreground)",
    opacity: "0",
    position: "absolute",
    transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
}, { label: "hella-tabs-trigger", layer: "hella" });

export const content = style({
  flex: "1",
  outlineStyle: "none",
}, { label: "hella-tabs-content", layer: "hella" });

// Variant/orientation state the trigger carries itself (data-orientation,
// data-variant): class-scoped nesting cannot restate them self-based at
// higher precedence, so these register as raw attribute selectors in the
// same layer, after the part classes.
css({
  "@layer hella": {
    "[data-slot='tabs-trigger'][data-orientation='vertical']": {
      justifyContent: "flex-start",
      width: "100%",
    },
    "[data-slot='tabs-trigger'][data-orientation='horizontal']::after": {
      bottom: "-5px",
      height: "2px",
      left: "0",
      right: "0",
    },
    "[data-slot='tabs-trigger'][data-orientation='vertical']::after": {
      bottom: "0",
      right: "-0.25rem",
      top: "0",
      width: "2px",
    },
    "[data-slot='tabs-trigger'][data-variant='default'][data-state='active']": {
      boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    },
    "[data-slot='tabs-trigger'][data-variant='line']": {
      backgroundColor: "transparent",
    },
    "[data-slot='tabs-trigger'][data-variant='line'][data-state='active']": {
      backgroundColor: "transparent",
      boxShadow: "none",
    },
    ".dark [data-slot='tabs-trigger'][data-variant='line'][data-state='active']": {
      backgroundColor: "transparent",
      borderColor: "transparent",
    },
    "[data-slot='tabs-trigger'][data-variant='line'][data-state='active']::after": {
      opacity: "1",
    },
  },
});
