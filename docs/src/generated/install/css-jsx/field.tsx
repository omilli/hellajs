import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const set = style("field-set", {
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  "&:has(> [data-slot='checkbox-group']), &:has(> [data-slot='radio-group'])": {
    gap: "0.75rem",
  },
});

const legend = style("field-legend", {
  fontWeight: "500",
  marginBottom: "0.75rem",
});

const legendVariants = {
  legend: style("field-legend-legend", {
    fontSize: "1rem",
    lineHeight: "1.5rem",
  }),
  label: style("field-legend-label", {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  }),
};

const group = style("field-group", {
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

const base = style("field", {
  display: "flex",
  gap: "0.75rem",
  width: "100%",
  "&[data-invalid='true']": {
    color: tokens.destructive,
  },
});

const orientation = {
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

const content = style("field-content", {
  display: "flex",
  flex: "1 1 0%",
  flexDirection: "column",
  gap: "0.375rem",
  lineHeight: "1.625",
});

const label = style("field-label", {
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

const title = style("field-title", {
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1.625",
  width: "fit-content",
});

const description = style("field-description", {
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

const separator = style("field-separator", {
  fontSize: "0.875rem",
  height: "1.25rem",
  marginBlock: "-0.5rem",
  position: "relative",
});

const separatorBase = style("field-separator-base", {
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

const separatorRule = style("field-separator-rule", {
  bottom: "0",
  left: "0",
  position: "absolute",
  right: "0",
  top: "50%",
});

const separatorContent = style("field-separator-content", {
  backgroundColor: tokens.background,
  color: tokens.mutedForeground,
  display: "block",
  marginLeft: "auto",
  marginRight: "auto",
  paddingInline: "0.5rem",
  position: "relative",
  width: "fit-content",
});

const error = style("field-error", {
  color: tokens.destructive,
  fontSize: "0.875rem",
  fontWeight: "400",
});

const errorList = style("field-error-list", {
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

interface FieldSetProps extends HTMLAttributes<"fieldset"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldSet({ children, class: cls, ...attrs }: FieldSetProps): JSX.Element {
  return (
    <fieldset
      data-slot="field-set"
      class={
        [set, cls]
      }
      {...attrs}
    >
      {children}
    </fieldset>
  );
}

interface FieldLegendProps extends HTMLAttributes<"legend"> {
  class?: string;
  children?: HellaChildren;
  variant?: "legend" | "label";
}

export function FieldLegend({ variant, children, class: cls, ...attrs }: FieldLegendProps): JSX.Element {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant ?? "legend"}
      class={
        [
          legend,
          legendVariants[variant ?? "legend"],
          cls,
        ]
      }
      {...attrs}
    >
      {children}
    </legend>
  );
}

interface FieldGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldGroup({ children, class: cls, ...attrs }: FieldGroupProps): JSX.Element {
  return (
    <div
      data-slot="field-group"
      class={
        [group, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface FieldProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "vertical" | "horizontal" | "responsive";
  /** Renders data-invalid="true" (destructive text) on the field; `disabled` (native attr) renders data-disabled="true" (label/title opacity). */
  invalid?: boolean;
}

export function Field({ orientation: orient, disabled, invalid, children, class: cls, ...attrs }: FieldProps): JSX.Element {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={orient ?? "vertical"}
      data-disabled={disabled ? "true" : undefined}
      data-invalid={invalid ? "true" : undefined}
      class={
        [
          base,
          orientation[orient ?? "vertical"],
          cls,
        ]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface FieldContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldContent({ children, class: cls, ...attrs }: FieldContentProps): JSX.Element {
  return (
    <div
      data-slot="field-content"
      class={
        [content, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface FieldLabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldLabel({ children, class: cls, ...attrs }: FieldLabelProps): JSX.Element {
  return (
    <label
      data-slot="field-label"
      class={
        [label, cls]
      }
      {...attrs}
    >
      {children}
    </label>
  );
}

interface FieldTitleProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldTitle({ children, class: cls, ...attrs }: FieldTitleProps): JSX.Element {
  return (
    <div
      data-slot="field-label"
      class={
        [title, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface FieldDescriptionProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldDescription({ children, class: cls, ...attrs }: FieldDescriptionProps): JSX.Element {
  return (
    <p
      data-slot="field-description"
      class={
        [description, cls]
      }
      {...attrs}
    >
      {children}
    </p>
  );
}

interface FieldSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldSeparator({ children, class: cls, ...attrs }: FieldSeparatorProps): JSX.Element {
  return (
    <div
      data-slot="field-separator"
      data-content={children ? "true" : "false"}
      class={
        [separator, cls]
      }
      {...attrs}
    >
      <div
        role="separator"
        data-slot="field-separator-rule"
        data-orientation="horizontal"
        aria-orientation="horizontal"
        class={[separatorBase, separatorRule]}
      />
      {children
        ? (
          <span
            data-slot="field-separator-content"
            class={[separatorContent]}
          >
            {children}
          </span>
        )
        : null}
    </div>
  );
}

interface FieldErrorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  errors?: Array<{ message?: string } | undefined>;
}

export function FieldError({ errors, children, class: cls, ...attrs }: FieldErrorProps): JSX.Element {
  const unique = (): { message?: string }[] => {
    const seen = new Map<string | undefined, { message?: string } | undefined>();
    for (const issue of errors ?? []) seen.set(issue?.message, issue);
    return [...seen.values()].filter((issue) => issue !== undefined);
  };
  const hasChildren = (): boolean => {
    if (children == null) return false;
    if (Array.isArray(children)) return children.length > 0;
    return true;
  };
  const hasContent = (): boolean => hasChildren() || unique().length > 0;
  return (
    <div
      role="alert"
      data-slot="field-error"
      hidden={() => !hasContent()}
      class={
        [error, cls]
      }
      {...attrs}
    >
      {() => {
        if (children) {
          return typeof children === "function" ? (children as () => HellaChild)() : children;
        }
        const issues = unique();
        if (issues.length === 1) return issues[0]!.message;
        if (issues.length === 0) return null;
        return (
          <ul class={errorList}>
            {issues.map((item) => item.message ? <li>{item.message}</li> : null)}
          </ul>
        );
      }}
    </div>
  );
}
