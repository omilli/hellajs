import { css, style } from "@hellajs/css";

export const set = style({
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  "&:has(> [data-slot='checkbox-group']), &:has(> [data-slot='radio-group'])": {
    gap: "0.75rem",
  },
}, { label: "field-set" });

export const legend = style({
  fontWeight: "500",
  marginBottom: "0.75rem",
}, { label: "field-legend" });

export const legendVariants = {
  legend: style({
    fontSize: "1rem",
    lineHeight: "1.5rem",
  }, { label: "field-legend-legend" }),
  label: style({
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  }, { label: "field-legend-label" }),
};

export const group = style({
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
}, { label: "field-group" });

export const base = style({
  display: "flex",
  gap: "0.75rem",
  width: "100%",
  "&[data-invalid='true']": {
    color: "var(--destructive)",
  },
}, { label: "field" });

export const orientation = {
  vertical: style({
    flexDirection: "column",
    "& > *": {
      width: "100%",
    },
    "& > .sr-only": {
      width: "auto",
    },
  }, { label: "field-vertical" }),
  horizontal: style({
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
  }, { label: "field-horizontal" }),
  responsive: style({
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
  }, { label: "field-responsive" }),
};

export const content = style({
  display: "flex",
  flex: "1 1 0%",
  flexDirection: "column",
  gap: "0.375rem",
  lineHeight: "1.625",
}, { label: "field-content" });

export const label = style({
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
    border: "1px solid var(--border)",
    borderRadius: "calc(var(--radius) * 0.8)",
    flexDirection: "column",
    width: "100%",
  },
  "& > [data-slot='field']": {
    padding: "1rem",
  },
  "&:has([data-state='checked'])": {
    backgroundColor: "color-mix(in oklab, var(--primary) 5%, transparent)",
    borderColor: "var(--primary)",
  },
  "&:is(.dark *):has([data-state='checked'])": {
    backgroundColor: "color-mix(in oklab, var(--primary) 10%, transparent)",
  },
}, { label: "field-label" });

export const title = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1.625",
  width: "fit-content",
}, { label: "field-title" });

export const description = style({
  color: "var(--muted-foreground)",
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
    color: "var(--primary)",
  },
}, { label: "field-description" });

export const separator = style({
  fontSize: "0.875rem",
  height: "1.25rem",
  marginBlock: "-0.5rem",
  position: "relative",
}, { label: "field-separator" });

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
}, { label: "field-separator-base" });

export const separatorRule = style({
  bottom: "0",
  left: "0",
  position: "absolute",
  right: "0",
  top: "50%",
}, { label: "field-separator-rule" });

export const separatorContent = style({
  backgroundColor: "var(--background)",
  color: "var(--muted-foreground)",
  display: "block",
  marginLeft: "auto",
  marginRight: "auto",
  paddingInline: "0.5rem",
  position: "relative",
  width: "fit-content",
}, { label: "field-separator-content" });

export const error = style({
  color: "var(--destructive)",
  fontSize: "0.875rem",
  fontWeight: "400",
}, { label: "field-error" });

export const errorList = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  listStyleType: "disc",
  marginLeft: "1rem",
}, { label: "field-error-list" });

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
