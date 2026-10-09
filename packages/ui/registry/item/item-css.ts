import { css, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const group = style("item-group", {
  display: "flex",
  flexDirection: "column",
});

export const separatorBase = style("item-separator", {
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

export const separator = style("item-separator-override", {
  marginBlock: "0",
});

export const base = style("item", {
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
});

export const variants = {
  default: style("item-default", {
    backgroundColor: "transparent",
  }),
  outline: style("item-outline", {
    borderColor: tokens.border,
  }),
  muted: style("item-muted", {
    backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  }),
};

export const sizes = {
  default: style("item-size-default", {
    gap: "1rem",
    padding: "1rem",
  }),
  sm: style("item-size-sm", {
    gap: "0.625rem",
    paddingBlock: "0.75rem",
    paddingInline: "1rem",
  }),
};

export const media = style("item-media", {
  alignItems: "center",
  display: "flex",
  flexShrink: "0",
  gap: "0.5rem",
  justifyContent: "center",
  "& svg": {
    pointerEvents: "none",
  },
});

export const mediaVariants = {
  default: style("item-media-default", {
    backgroundColor: "transparent",
  }),
  icon: style("item-media-icon", {
    backgroundColor: tokens.muted,
    border: `1px solid ${tokens.border}`,
    borderRadius: `calc(${tokens.radius} * 0.6)`,
    height: "2rem",
    width: "2rem",
    "& svg:not([class*='size-'])": {
      height: "1rem",
      width: "1rem",
    },
  }),
  image: style("item-media-image", {
    borderRadius: `calc(${tokens.radius} * 0.6)`,
    height: "2.5rem",
    overflow: "hidden",
    width: "2.5rem",
    "& img": {
      height: "100%",
      objectFit: "cover",
      width: "100%",
    },
  }),
};

export const content = style("item-content", {
  display: "flex",
  flex: "1 1 0%",
  flexDirection: "column",
  gap: "0.25rem",
  "& + [data-slot='item-content']": {
    flex: "none",
  },
});

export const title = style("item-title", {
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1.625",
  width: "fit-content",
});

export const description = style("item-description", {
  color: tokens.mutedForeground,
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
    color: tokens.primary,
  },
});

export const actions = style("item-actions", {
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
});

export const header = style("item-header", {
  alignItems: "center",
  display: "flex",
  flexBasis: "100%",
  gap: "0.5rem",
  justifyContent: "space-between",
});

export const footer = style("item-footer", {
  alignItems: "center",
  display: "flex",
  flexBasis: "100%",
  gap: "0.5rem",
  justifyContent: "space-between",
});

css({
  "[data-slot='item']:has([data-slot='item-description']) [data-slot='item-media']": {
    alignSelf: "flex-start",
    transform: "translateY(0.125rem)",
  },
});
