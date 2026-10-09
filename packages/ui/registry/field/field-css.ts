import { css, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const set = style("field-set", {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  "&:has(> [data-slot='checkbox-group']), &:has(> [data-slot='radio-group'])": {
    gap: "0.75rem",
  },
});

export const legend = style("field-legend", {
  fontWeight: "500",
  marginBottom: "0.75rem",
});

export const legendVariants = {
  legend: style("field-legend-legend", {
    fontSize: "1rem",
    lineHeight: "1.5rem",
  }),
  label: style("field-legend-label", {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  }),
};

export const group = style("field-group", {
  container: "field-group / inline-size",
  display: "flex",
  flexDirection: "column",
  gap: "1.75rem",
  width: "100%",
  "&[data-slot='checkbox-group']": {
    gap: "0.75rem",
  },
  "& > [data-slot='field-group']": {
    gap: "1rem",
  },
});

export const base = style("field", {
  display: "flex",
  gap: "0.75rem",
  width: "100%",
  "&[data-invalid='true']": {
    color: tokens.destructive,
  },
});

export const orientation = {
  vertical: style("field-vertical", {
    flexDirection: "column",
    "& > *": {
      width: "100%",
    },
    "& > .sr-only": {
      width: "auto",
    },
  }),
  horizontal: style("field-horizontal", {
    alignItems: "center",
    flexDirection: "row",
    "& > [data-slot='field-label']": {
      flex: "auto",
    },
    "&:has([data-slot='field-content'])": {
      alignItems: "flex-start",
    },
    "&:has([data-slot='field-content']) > [role='checkbox'], &:has([data-slot='field-content']) > [role='radio']": {
      marginTop: "1px",
    },
  }),
  responsive: style("field-responsive", {
    flexDirection: "column",
    "& > *": {
      width: "100%",
    },
    "& > .sr-only": {
      width: "auto",
    },
    "@container field-group (min-width: 28rem)": {
      alignItems: "center",
      flexDirection: "row",
      "& > *": {
        width: "auto",
      },
      "& > .sr-only": {
        width: "auto",
      },
      "& > [data-slot='field-label']": {
        flex: "auto",
      },
      "&:has([data-slot='field-content'])": {
        alignItems: "flex-start",
      },
      "&:has([data-slot='field-content']) > [role='checkbox'], &:has([data-slot='field-content']) > [role='radio']": {
        marginTop: "1px",
      },
    },
  }),
};

export const content = style("field-content", {
  display: "flex",
  flex: "1 1 0%",
  flexDirection: "column",
  gap: "0.375rem",
  lineHeight: "1.625",
});

export const label = style("field-label", {
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1.625",
  userSelect: "none",
  width: "fit-content",
  "&:is(.group[data-disabled='true'] *)": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:is(.peer:disabled ~ *)": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&:has(> [data-slot='field'])": {
    border: `1px solid ${tokens.border}`,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    flexDirection: "column",
    width: "100%",
  },
  "& > [data-slot='field']": {
    padding: "1rem",
  },
  "&:has([data-state='checked'])": {
    backgroundColor: `color-mix(in oklab, ${tokens.primary} 5%, transparent)`,
    borderColor: tokens.primary,
  },
  "&:is(.dark *):has([data-state='checked'])": {
    backgroundColor: `color-mix(in oklab, ${tokens.primary} 10%, transparent)`,
  },
});

export const title = style("field-title", {
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1.625",
  width: "fit-content",
});

export const description = style("field-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  fontWeight: "400",
  lineHeight: "1.25rem",
  "&:last-child": {
    marginTop: "0",
  },
  "&:nth-last-child(2)": {
    marginTop: "-0.25rem",
  },
  "& > a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "4px",
  },
  "& > a:hover": {
    color: tokens.primary,
  },
});

export const separator = style("field-separator", {
  fontSize: "0.875rem",
  height: "1.25rem",
  marginBlock: "-0.5rem",
  position: "relative",
});

export const separatorBase = style("field-separator-base", {
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

export const separatorRule = style("field-separator-rule", {
  bottom: "0",
  left: "0",
  position: "absolute",
  right: "0",
  top: "50%",
});

export const separatorContent = style("field-separator-content", {
  backgroundColor: tokens.background,
  color: tokens.mutedForeground,
  display: "block",
  marginLeft: "auto",
  marginRight: "auto",
  paddingInline: "0.5rem",
  position: "relative",
  width: "fit-content",
});

export const error = style("field-error", {
  color: tokens.destructive,
  fontSize: "0.875rem",
  fontWeight: "400",
});

export const errorList = style("field-error-list", {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  listStyleType: "disc",
  marginLeft: "1rem",
});

css({
  "[data-slot='field'][data-disabled='true'] [data-slot='field-label']": {
    opacity: "0.5",
  },
  "[data-slot='field-group'][data-variant='outline'] [data-slot='field-separator']": {
    marginBottom: "-0.5rem",
  },
  "[data-slot='field']:has([data-orientation='horizontal']) [data-slot='field-description']": {
    textWrap: "balance",
  },
  "[data-variant='legend'] + [data-slot='field-description']": {
    marginTop: "-0.375rem",
  },
});
