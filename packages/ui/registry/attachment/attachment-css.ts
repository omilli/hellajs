import { css, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("attachment", {
  position: "relative",
  display: "flex",
  width: "fit-content",
  maxWidth: "100%",
  minWidth: "0",
  flexShrink: "0",
  flexWrap: "wrap",
  borderRadius: `calc(${tokens.radius} * 1.4)`,
  border: `1px solid ${tokens.border}`,
  backgroundColor: tokens.card,
  color: tokens.cardForeground,
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&:focus-within": {
    boxShadow: `0 0 0 1px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:has(> a, > button):hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  },
  "&[data-state='error']": {
    borderColor: `color-mix(in oklab, ${tokens.destructive} 30%, transparent)`,
  },
  "&[data-state='idle']": {
    borderStyle: "dashed",
  },
});

export const sizes = {
  default: style("attachment-size-default", {
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
  }),
  sm: style("attachment-size-sm", {
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
  }),
  xs: style("attachment-size-xs", {
    borderRadius: `calc(${tokens.radius} * 1)`,
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
  }),
};

export const orientations = {
  horizontal: style("attachment-horizontal", {
    minWidth: "10rem",
    alignItems: "center",
  }),
  vertical: style("attachment-vertical", {
    width: "6rem",
    flexDirection: "column",
    "&:has([data-slot='attachment-content'])": {
      width: "7.5rem",
    },
  }),
};

export const media = style("attachment-media", {
  position: "relative",
  display: "flex",
  aspectRatio: "1 / 1",
  width: "2.5rem",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  borderRadius: `calc(${tokens.radius} * 1)`,
  backgroundColor: tokens.muted,
  color: tokens.foreground,
  "& svg": {
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
});

export const mediaVariants = {
  icon: style("attachment-media-icon", {}),
  image: style("attachment-media-image", {
    opacity: "0.6",
    "& > img": {
      aspectRatio: "1 / 1",
      width: "100%",
      objectFit: "cover",
    },
  }),
};

export const content = style("attachment-content", {
  maxWidth: "100%",
  minWidth: "0",
  flex: "1",
  lineHeight: "1.25",
});

export const title = style("attachment-title", {
  display: "block",
  maxWidth: "100%",
  minWidth: "0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: "500",
});

export const description = style("attachment-description", {
  marginTop: "0.125rem",
  display: "block",
  minWidth: "0",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.75rem",
  lineHeight: "1rem",
  color: tokens.mutedForeground,
});

export const actions = style("attachment-actions", {
  position: "relative",
  zIndex: "20",
  display: "flex",
  flexShrink: "0",
  alignItems: "center",
});

export const trigger = style("attachment-trigger", {
  position: "absolute",
  inset: "0",
  zIndex: "10",
  outlineStyle: "none",
});

export const group = style("attachment-group", {
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
});

export const buttonBase = style("attachment-action", {
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

export const buttonVariants = {
  default: style("attachment-action-default", {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.primary} 90%, transparent)`,
    },
  }),
  destructive: style("attachment-action-destructive", {
    backgroundColor: tokens.destructive,
    color: "#fff",
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 90%, transparent)`,
    },
    "&:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
    },
    "&:is(.dark *)": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 60%, transparent)`,
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  }),
  outline: style("attachment-action-outline", {
    background: tokens.background,
    border: `1px solid ${tokens.border}`,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *)": {
      borderColor: tokens.input,
      background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    },
    "&:is(.dark *):hover": {
      background: `color-mix(in oklab, ${tokens.input} 50%, transparent)`,
    },
  }),
  secondary: style("attachment-action-secondary", {
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.secondary} 80%, transparent)`,
    },
  }),
  ghost: style("attachment-action-ghost", {
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
  }),
  link: style("attachment-action-link", {
    color: tokens.primary,
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }),
};

export const buttonSizes = {
  default: style("attachment-action-size-default", {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }),
  xs: style("attachment-action-size-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
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
  }),
  sm: style("attachment-action-size-sm", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  lg: style("attachment-action-size-lg", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }),
  icon: style("attachment-action-size-icon", {
    height: "2.25rem",
    width: "2.25rem",
  }),
  "icon-xs": style("attachment-action-size-icon-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("attachment-action-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
  "icon-lg": style("attachment-action-size-icon-lg", {
    height: "2.5rem",
    width: "2.5rem",
  }),
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
    borderRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='attachment'][data-size='xs'] [data-slot='attachment-media'] svg:not([class*='size-'])": {
    height: "0.875rem",
    width: "0.875rem",
  },
  "[data-slot='attachment'][data-state='error'] [data-slot='attachment-media']": {
    backgroundColor: `color-mix(in oklab, ${tokens.destructive} 10%, transparent)`,
    color: tokens.destructive,
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
    color: `color-mix(in oklab, ${tokens.destructive} 80%, transparent)`,
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-actions']": {
    position: "absolute",
    top: "0.75rem",
    right: "0.75rem",
    gap: "0.25rem",
  },
});
