import { css, style } from "@hellajs/css";

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
  "&:has(> [data-align='block-start'])": {
    flexDirection: "column",
    height: "auto",
  },
  "&:has(> [data-align='block-start']) > input": {
    paddingBottom: "0.75rem",
  },
  "&:has(> [data-align='block-end'])": {
    flexDirection: "column",
    height: "auto",
  },
  "&:has(> [data-align='block-end']) > input": {
    paddingTop: "0.75rem",
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
}, { label: "hella-input-group", layer: "hella" });

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
  paddingBlock: "0.375rem",
  userSelect: "none",
  "& > kbd": {
    borderRadius: "calc(var(--radius) - 5px)",
  },
  "& > svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-input-group-addon", layer: "hella" });

export const addonAlign = {
  "inline-start": style({
    order: "-9999",
    paddingLeft: "0.75rem",
    "&:has(> button)": {
      marginLeft: "-0.45rem",
    },
    "&:has(> kbd)": {
      marginLeft: "-0.35rem",
    },
  }, { label: "hella-input-group-addon-inline-start", layer: "hella" }),
  "inline-end": style({
    order: "9999",
    paddingRight: "0.75rem",
    "&:has(> button)": {
      marginRight: "-0.45rem",
    },
    "&:has(> kbd)": {
      marginRight: "-0.35rem",
    },
  }, { label: "hella-input-group-addon-inline-end", layer: "hella" }),
  "block-start": style({
    justifyContent: "flex-start",
    order: "-9999",
    paddingInline: "0.75rem",
    paddingTop: "0.75rem",
    width: "100%",
  }, { label: "hella-input-group-addon-block-start", layer: "hella" }),
  "block-end": style({
    justifyContent: "flex-start",
    order: "9999",
    paddingInline: "0.75rem",
    paddingBottom: "0.75rem",
    width: "100%",
  }, { label: "hella-input-group-addon-block-end", layer: "hella" }),
};

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
}, { label: "hella-input-group-button", layer: "hella" });

export const buttonVariants = {
  default: style({
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  }, { label: "hella-input-group-button-default", layer: "hella" }),
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
  }, { label: "hella-input-group-button-destructive", layer: "hella" }),
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
  }, { label: "hella-input-group-button-outline", layer: "hella" }),
  secondary: style({
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
    },
  }, { label: "hella-input-group-button-secondary", layer: "hella" }),
  ghost: style({
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }, { label: "hella-input-group-button-ghost", layer: "hella" }),
  link: style({
    color: "var(--primary)",
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }, { label: "hella-input-group-button-link", layer: "hella" }),
};

export const buttonSizes = {
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
  }, { label: "hella-input-group-button-size-xs", layer: "hella" }),
  sm: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }, { label: "hella-input-group-button-size-sm", layer: "hella" }),
  "icon-xs": style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "hella-input-group-button-size-icon-xs", layer: "hella" }),
  "icon-sm": style({
    height: "2rem",
    width: "2rem",
  }, { label: "hella-input-group-button-size-icon-sm", layer: "hella" }),
};

export const sizes = {
  xs: style({
    alignItems: "center",
    borderRadius: "calc(var(--radius) - 5px)",
    display: "flex",
    gap: "0.25rem",
    height: "1.5rem",
    paddingInline: "0.5rem",
    boxShadow: "none",
    "&:has(> svg)": {
      paddingInline: "0.5rem",
    },
    "& > svg:not([class*='size-'])": {
      height: "0.875rem",
      width: "0.875rem",
    },
  }, { label: "hella-input-group-size-xs", layer: "hella" }),
  sm: style({
    alignItems: "center",
    borderRadius: "calc(var(--radius) * 0.8)",
    display: "flex",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.625rem",
    boxShadow: "none",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }, { label: "hella-input-group-size-sm", layer: "hella" }),
  "icon-xs": style({
    alignItems: "center",
    borderRadius: "calc(var(--radius) - 5px)",
    display: "flex",
    height: "1.5rem",
    padding: "0",
    width: "1.5rem",
    boxShadow: "none",
    "&:has(> svg)": {
      padding: "0",
    },
  }, { label: "hella-input-group-size-icon-xs", layer: "hella" }),
  "icon-sm": style({
    alignItems: "center",
    display: "flex",
    height: "2rem",
    padding: "0",
    width: "2rem",
    boxShadow: "none",
    "&:has(> svg)": {
      padding: "0",
    },
  }, { label: "hella-input-group-size-icon-sm", layer: "hella" }),
};

export const text = style({
  alignItems: "center",
  color: "var(--muted-foreground)",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  "& svg": {
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-input-group-text", layer: "hella" });

export const inputBase = style({
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
}, { label: "hella-input-group-input", layer: "hella" });

export const inputFocus = style({
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "hella-input-group-input-focus", layer: "hella" });

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
}, { label: "hella-input-group-input-invalid", layer: "hella" });

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
}, { label: "hella-input-group-input-control", layer: "hella" });

export const textareaBase = style({
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  fieldSizing: "content",
  minHeight: "4rem",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingInline: "0.75rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&::placeholder": {
    color: "var(--muted-foreground)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
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
}, { label: "hella-input-group-textarea", layer: "hella" });

export const textareaFocus = style({
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "hella-input-group-textarea-focus", layer: "hella" });

export const textareaInvalid = style({
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-input-group-textarea-invalid", layer: "hella" });

export const textareaControl = style({
  background: "transparent",
  borderRadius: "0",
  borderWidth: "0",
  flex: "1 1 0%",
  paddingBlock: "0.75rem",
  resize: "none",
  boxShadow: "none",
  "&:focus-visible": {
    boxShadow: "none",
  },
  "&:is(.dark *)": {
    background: "transparent",
  },
}, { label: "hella-input-group-textarea-control", layer: "hella" });

css({
  "@layer hella": {
    "[data-slot='input-group'][data-disabled='true'] [data-slot='input-group-addon']": {
      opacity: "0.5",
    },
    "[data-slot='input-group']:has(input) [data-slot='input-group-addon'][data-align='block-start']": {
      paddingTop: "0.625rem",
    },
    "[data-slot='input-group']:has(input) [data-slot='input-group-addon'][data-align='block-end']": {
      paddingBottom: "0.625rem",
    },
    ".border-b [data-slot='input-group-addon'][data-align='block-start'], .border-b ~ [data-slot='input-group-addon'][data-align='block-start']": {
      paddingBottom: "0.75rem",
    },
    ".border-t [data-slot='input-group-addon'][data-align='block-end'], .border-t ~ [data-slot='input-group-addon'][data-align='block-end']": {
      paddingTop: "0.75rem",
    },
  },
});
