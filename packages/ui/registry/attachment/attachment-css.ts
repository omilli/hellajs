import { css, style } from "@hellajs/css";

export const base = style({
  position: "relative",
  display: "flex",
  width: "fit-content",
  maxWidth: "100%",
  minWidth: "0",
  flexShrink: "0",
  flexWrap: "wrap",
  borderRadius: "calc(var(--radius) * 1.4)",
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  color: "var(--card-foreground)",
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&:focus-within": {
    boxShadow: "0 0 0 1px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:has(> a, > button):hover": {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  "&[data-state='error']": {
    borderColor: "color-mix(in oklab, var(--destructive) 30%, transparent)",
  },
  "&[data-state='idle']": {
    borderStyle: "dashed",
  },
}, { label: "attachment" });

export const sizes = {
  default: style({
    gap: "0.5rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    "&:has([data-slot='attachment-content'])": {
      paddingInline: "0.625rem",
      paddingBlock: "0.5rem",
    },
    "&:has([data-slot='attachment-media'])": {
      padding: "0.5rem",
    },
  }, { label: "attachment-size-default" }),
  sm: style({
    gap: "0.625rem",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    "&:has([data-slot='attachment-content'])": {
      paddingInline: "0.5rem",
      paddingBlock: "0.375rem",
    },
    "&:has([data-slot='attachment-media'])": {
      padding: "0.375rem",
    },
  }, { label: "attachment-size-sm" }),
  xs: style({
    borderRadius: "calc(var(--radius) * 1)",
    gap: "0.375rem",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    "&:has([data-slot='attachment-content'])": {
      paddingInline: "0.375rem",
      paddingBlock: "0.25rem",
    },
    "&:has([data-slot='attachment-media'])": {
      padding: "0.25rem",
    },
  }, { label: "attachment-size-xs" }),
};

export const orientations = {
  horizontal: style({
    minWidth: "10rem",
    alignItems: "center",
  }, { label: "attachment-horizontal" }),
  vertical: style({
    width: "6rem",
    flexDirection: "column",
    "&:has([data-slot='attachment-content'])": {
      width: "7.5rem",
    },
  }, { label: "attachment-vertical" }),
};

export const media = style({
  position: "relative",
  display: "flex",
  aspectRatio: "1 / 1",
  width: "2.5rem",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  borderRadius: "calc(var(--radius) * 1)",
  backgroundColor: "var(--muted)",
  color: "var(--foreground)",
  "& svg": {
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "attachment-media" });

export const mediaVariants = {
  icon: style({}, { label: "attachment-media-icon" }),
  image: style({
    opacity: "0.6",
    "& > img": {
      aspectRatio: "1 / 1",
      width: "100%",
      objectFit: "cover",
    },
  }, { label: "attachment-media-image" }),
};

export const content = style({
  maxWidth: "100%",
  minWidth: "0",
  flex: "1",
  lineHeight: "1.25",
}, { label: "attachment-content" });

export const title = style({
  display: "block",
  maxWidth: "100%",
  minWidth: "0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: "500",
}, { label: "attachment-title" });

export const description = style({
  marginTop: "0.125rem",
  display: "block",
  minWidth: "0",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.75rem",
  lineHeight: "1rem",
  color: "var(--muted-foreground)",
}, { label: "attachment-description" });

export const actions = style({
  position: "relative",
  zIndex: "20",
  display: "flex",
  flexShrink: "0",
  alignItems: "center",
}, { label: "attachment-actions" });

export const trigger = style({
  position: "absolute",
  inset: "0",
  zIndex: "10",
  outlineStyle: "none",
}, { label: "attachment-trigger" });

export const group = style({
  display: "flex",
  minWidth: "0",
  gap: "0.75rem",
  overflowX: "auto",
  overscrollBehaviorX: "contain",
  scrollSnapType: "x mandatory",
  scrollPaddingInline: "0.25rem",
  paddingBlock: "0.25rem",
  "& > [data-slot='attachment']": {
    flex: "none",
    scrollSnapAlign: "start",
  },
}, { label: "attachment-group" });

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
}, { label: "attachment-action" });

export const buttonVariants = {
  default: style({
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  }, { label: "attachment-action-default" }),
  destructive: style({
    backgroundColor: "var(--destructive)",
    color: "#fff",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 90%, transparent)",
    },
    "&:focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
    },
    "&:is(.dark *)": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 60%, transparent)",
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
    },
  }, { label: "attachment-action-destructive" }),
  outline: style({
    background: "var(--background)",
    border: "1px solid var(--border)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *)": {
      borderColor: "var(--input)",
      background: "color-mix(in oklab, var(--input) 30%, transparent)",
    },
    "&:is(.dark *):hover": {
      background: "color-mix(in oklab, var(--input) 50%, transparent)",
    },
  }, { label: "attachment-action-outline" }),
  secondary: style({
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
    },
  }, { label: "attachment-action-secondary" }),
  ghost: style({
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }, { label: "attachment-action-ghost" }),
  link: style({
    color: "var(--primary)",
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }, { label: "attachment-action-link" }),
};

export const buttonSizes = {
  default: style({
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }, { label: "attachment-action-size-default" }),
  xs: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    fontSize: "0.75rem",
    gap: "0.25rem",
    height: "1.5rem",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    "&:has(> svg)": {
      paddingInline: "0.375rem",
    },
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "attachment-action-size-xs" }),
  sm: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }, { label: "attachment-action-size-sm" }),
  lg: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }, { label: "attachment-action-size-lg" }),
  icon: style({
    height: "2.25rem",
    width: "2.25rem",
  }, { label: "attachment-action-size-icon" }),
  "icon-xs": style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "attachment-action-size-icon-xs" }),
  "icon-sm": style({
    height: "2rem",
    width: "2rem",
  }, { label: "attachment-action-size-icon-sm" }),
  "icon-lg": style({
    height: "2.5rem",
    width: "2.5rem",
  }, { label: "attachment-action-size-icon-lg" }),
};

css({
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-media']": {
    width: "100%",
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-media'] > [data-slot='spinner']": {
    height: "1.5rem !important",
    width: "1.5rem !important",
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-media'] svg:not([class*='size-'])": {
    height: "1.5rem",
    width: "1.5rem",
  },
  "[data-slot='attachment'][data-size='sm'] [data-slot='attachment-media']": {
    width: "2rem",
  },
  "[data-slot='attachment'][data-size='xs'] [data-slot='attachment-media']": {
    width: "1.75rem",
    borderRadius: "calc(var(--radius) * 0.8)",
  },
  "[data-slot='attachment'][data-size='xs'] [data-slot='attachment-media'] svg:not([class*='size-'])": {
    height: "0.875rem",
    width: "0.875rem",
  },
  "[data-slot='attachment'][data-state='error'] [data-slot='attachment-media']": {
    backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)",
    color: "var(--destructive)",
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-content']": {
    paddingInline: "0.25rem",
  },
  "[data-slot='attachment'][data-state='done'] [data-slot='attachment-media'][data-variant='image']": {
    opacity: "1",
  },
  "[data-slot='attachment'][data-state='idle'] [data-slot='attachment-media'][data-variant='image']": {
    opacity: "1",
  },
  "[data-slot='attachment'][data-state='error'] [data-slot='attachment-description']": {
    color: "color-mix(in oklab, var(--destructive) 80%, transparent)",
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-actions']": {
    position: "absolute",
    top: "0.75rem",
    right: "0.75rem",
    gap: "0.25rem",
  },
});
