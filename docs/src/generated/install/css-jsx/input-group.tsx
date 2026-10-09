import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("input-group", {
  alignItems: "center",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  height: "2.25rem",
  minWidth: "0",
  outlineStyle: "none",
  position: "relative",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&:is(.dark *)": {
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
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
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:has([data-slot][aria-invalid='true'])": {
    borderColor: tokens.destructive,
  },
  "&:has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *):has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

const addon = style("input-group-addon", {
  alignItems: "center",
  color: tokens.mutedForeground,
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
    borderRadius: `calc(${tokens.radius} - 5px)`,
  },
  "& > svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
});

const addonAlign = {
  "inline-start": style("input-group-addon-inline-start", {
    order: "-9999",
    paddingLeft: "0.75rem",
    "&:has(> button)": {
      marginLeft: "-0.45rem",
    },
    "&:has(> kbd)": {
      marginLeft: "-0.35rem",
    },
  }),
  "inline-end": style("input-group-addon-inline-end", {
    order: "9999",
    paddingRight: "0.75rem",
    "&:has(> button)": {
      marginRight: "-0.45rem",
    },
    "&:has(> kbd)": {
      marginRight: "-0.35rem",
    },
  }),
  "block-start": style("input-group-addon-block-start", {
    justifyContent: "flex-start",
    order: "-9999",
    paddingInline: "0.75rem",
    paddingTop: "0.75rem",
    width: "100%",
  }),
  "block-end": style("input-group-addon-block-end", {
    justifyContent: "flex-start",
    order: "9999",
    paddingInline: "0.75rem",
    paddingBottom: "0.75rem",
    width: "100%",
  }),
};

const buttonBase = style("input-group-button", {
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

const buttonVariants = {
  default: style("input-group-button-default", {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.primary} 90%, transparent)`,
    },
  }),
  destructive: style("input-group-button-destructive", {
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
  outline: style("input-group-button-outline", {
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
  secondary: style("input-group-button-secondary", {
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.secondary} 80%, transparent)`,
    },
  }),
  ghost: style("input-group-button-ghost", {
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
  }),
  link: style("input-group-button-link", {
    color: tokens.primary,
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }),
};

const buttonSizes = {
  xs: style("input-group-button-size-xs", {
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
  sm: style("input-group-button-size-sm", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  "icon-xs": style("input-group-button-size-icon-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("input-group-button-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
};

const sizes = {
  xs: style("input-group-size-xs", {
    alignItems: "center",
    borderRadius: `calc(${tokens.radius} - 5px)`,
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
  }),
  sm: style("input-group-size-sm", {
    alignItems: "center",
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    display: "flex",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.625rem",
    boxShadow: "none",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  "icon-xs": style("input-group-size-icon-xs", {
    alignItems: "center",
    borderRadius: `calc(${tokens.radius} - 5px)`,
    display: "flex",
    height: "1.5rem",
    padding: "0",
    width: "1.5rem",
    boxShadow: "none",
    "&:has(> svg)": {
      padding: "0",
    },
  }),
  "icon-sm": style("input-group-size-icon-sm", {
    alignItems: "center",
    display: "flex",
    height: "2rem",
    padding: "0",
    width: "2rem",
    boxShadow: "none",
    "&:has(> svg)": {
      padding: "0",
    },
  }),
};

const text = style("input-group-text", {
  alignItems: "center",
  color: tokens.mutedForeground,
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
});

const inputBase = style("input-group-input", {
  background: "transparent",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    color: tokens.foreground,
    display: "inline-flex",
    fontSize: "0.875rem",
    fontWeight: "500",
    height: "1.75rem",
  },
  "&::placeholder": {
    color: tokens.mutedForeground,
  },
  "&::selection": {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
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
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
});

const inputFocus = style("input-group-input-focus", {
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
});

const inputInvalid = style("input-group-input-invalid", {
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

const inputControl = style("input-group-input-control", {
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
});

const textareaBase = style("input-group-textarea", {
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    color: tokens.mutedForeground,
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
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
});

const textareaFocus = style("input-group-textarea-focus", {
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
});

const textareaInvalid = style("input-group-textarea-invalid", {
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

const textareaControl = style("input-group-textarea-control", {
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
});

css({
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
});

interface InputGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Renders data-disabled="true" on the group; addons read it for their opacity state. */
  disabled?: boolean;
  class?: string;
}

export default function InputGroup({ disabled, children, class: cls, ...attrs }: InputGroupProps): JSX.Element {
  return (
    <div
      data-slot="input-group"
      role="group"
      data-disabled={disabled ? "true" : undefined}
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface InputGroupAddonProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
  class?: string;
}

export function InputGroupAddon({ align, children, class: cls, ...attrs }: InputGroupAddonProps): JSX.Element {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-align={align ?? "inline-start"}
      class={
        [
          addon,
          addonAlign[align ?? "inline-start"],
          cls,
        ]
      }
      e:click={(e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest("button")) return;
        target.closest('[data-slot="input-group"]')?.querySelector("input")?.focus();
      }}
      {...attrs}
    >
      {children}
    </div>
  );
}

interface InputGroupButtonProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
  class?: string;
}

export function InputGroupButton({ variant, size, children, class: cls, ...attrs }: InputGroupButtonProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="button"
      data-variant={variant ?? "ghost"}
      data-size={size ?? "xs"}
      class={
        [
          buttonBase,
          buttonVariants[variant ?? "ghost"],
          buttonSizes[size ?? "xs"],
          sizes[size ?? "xs"],
          cls,
        ]
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

interface InputGroupTextProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export function InputGroupText({ children, class: cls, ...attrs }: InputGroupTextProps): JSX.Element {
  return (
    <span
      data-slot="input-group-text"
      class={
        [text, cls]
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface InputGroupInputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export function InputGroupInput({ class: cls, ...attrs }: InputGroupInputProps): JSX.Element {
  return (
    <input
      data-slot="input-group-control"
      class={
        [
          inputBase,
          inputFocus,
          inputInvalid,
          inputControl,
          cls,
        ]
      }
      {...attrs}
    />
  );
}

interface InputGroupTextareaProps extends HTMLAttributes<"textarea"> {
  class?: string;
}

export function InputGroupTextarea({ class: cls, ...attrs }: InputGroupTextareaProps): JSX.Element {
  return (
    <textarea
      data-slot="input-group-control"
      class={
        [
          textareaBase,
          textareaFocus,
          textareaInvalid,
          textareaControl,
          cls,
        ]
      }
      {...attrs}
    />
  );
}
