import { css, style } from "@hellajs/css";

export const group = style({
  display: "flex",
  flexDirection: "column",
}, { label: "item-group" });

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
}, { label: "item-separator" });

export const separator = style({
  marginBlock: "0",
}, { label: "item-separator-override" });

export const base = style({
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "color 100ms cubic-bezier(0.4, 0, 0.2, 1), background-color 100ms cubic-bezier(0.4, 0, 0.2, 1), border-color 100ms cubic-bezier(0.4, 0, 0.2, 1), outline-color 100ms cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 100ms cubic-bezier(0.4, 0, 0.2, 1), fill 100ms cubic-bezier(0.4, 0, 0.2, 1), stroke 100ms cubic-bezier(0.4, 0, 0.2, 1)",
  "& a": {
    transition: "color 100ms cubic-bezier(0.4, 0, 0.2, 1), background-color 100ms cubic-bezier(0.4, 0, 0.2, 1), border-color 100ms cubic-bezier(0.4, 0, 0.2, 1), outline-color 100ms cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 100ms cubic-bezier(0.4, 0, 0.2, 1), fill 100ms cubic-bezier(0.4, 0, 0.2, 1), stroke 100ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  "& a:hover": {
    backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "item" });

export const variants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "item-default" }),
  outline: style({
    borderColor: "var(--border)",
  }, { label: "item-outline" }),
  muted: style({
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  }, { label: "item-muted" }),
};

export const sizes = {
  default: style({
    gap: "1rem",
    padding: "1rem",
  }, { label: "item-size-default" }),
  sm: style({
    gap: "0.625rem",
    paddingBlock: "0.75rem",
    paddingInline: "1rem",
  }, { label: "item-size-sm" }),
};

export const media = style({
  alignItems: "center",
  display: "flex",
  flexShrink: "0",
  gap: "0.5rem",
  justifyContent: "center",
  "& svg": {
    pointerEvents: "none",
  },
}, { label: "item-media" });

export const mediaVariants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "item-media-default" }),
  icon: style({
    backgroundColor: "var(--muted)",
    border: "1px solid var(--border)",
    borderRadius: "calc(var(--radius) * 0.6)",
    height: "2rem",
    width: "2rem",
    "& svg:not([class*='size-'])": {
      height: "1rem",
      width: "1rem",
    },
  }, { label: "item-media-icon" }),
  image: style({
    borderRadius: "calc(var(--radius) * 0.6)",
    height: "2.5rem",
    overflow: "hidden",
    width: "2.5rem",
    "& img": {
      height: "100%",
      objectFit: "cover",
      width: "100%",
    },
  }, { label: "item-media-image" }),
};

export const content = style({
  display: "flex",
  flex: "1 1 0%",
  flexDirection: "column",
  gap: "0.25rem",
  "& + [data-slot='item-content']": {
    flex: "none",
  },
}, { label: "item-content" });

export const title = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1.625",
  width: "fit-content",
}, { label: "item-title" });

export const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  fontWeight: "400",
  lineHeight: "1.25rem",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: "2",
  textWrap: "balance",
  "& > a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "4px",
  },
  "& > a:hover": {
    color: "var(--primary)",
  },
}, { label: "item-description" });

export const actions = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
}, { label: "item-actions" });

export const header = style({
  alignItems: "center",
  display: "flex",
  flexBasis: "100%",
  gap: "0.5rem",
  justifyContent: "space-between",
}, { label: "item-header" });

export const footer = style({
  alignItems: "center",
  display: "flex",
  flexBasis: "100%",
  gap: "0.5rem",
  justifyContent: "space-between",
}, { label: "item-footer" });

css({
  "[data-slot='item']:has([data-slot='item-description']) [data-slot='item-media']": {
    alignSelf: "flex-start",
    transform: "translateY(0.125rem)",
  },
});
