import type { HellaChild, HellaChildren } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

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
    color: "var(--destructive)",
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
});

const separator = style("field-separator", {
  fontSize: "0.875rem",
  height: "1.25rem",
  marginBlock: "-0.5rem",
  position: "relative",
});

const separatorBase = style("field-separator-base", {
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
});

const separatorRule = style("field-separator-rule", {
  bottom: "0",
  left: "0",
  position: "absolute",
  right: "0",
  top: "50%",
});

const separatorContent = style("field-separator-content", {
  backgroundColor: "var(--background)",
  color: "var(--muted-foreground)",
  display: "block",
  marginLeft: "auto",
  marginRight: "auto",
  paddingInline: "0.5rem",
  position: "relative",
  width: "fit-content",
});

const error = style("field-error", {
  color: "var(--destructive)",
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

interface FieldSetProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldSet(props: FieldSetProps): JSX.Element {
  return (
    <fieldset
      data-slot="field-set"
      class={
        [set, props.class]
      }
    >
      {props.children}
    </fieldset>
  );
}

interface FieldLegendProps {
  children?: HellaChildren;
  variant?: "legend" | "label";
  class?: string;
}

export function FieldLegend(props: FieldLegendProps): JSX.Element {
  return (
    <legend
      data-slot="field-legend"
      data-variant={props.variant ?? "legend"}
      class={
        [
          legend,
          legendVariants[props.variant ?? "legend"],
          props.class,
        ]
      }
    >
      {props.children}
    </legend>
  );
}

interface FieldGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldGroup(props: FieldGroupProps): JSX.Element {
  return (
    <div
      data-slot="field-group"
      class={
        [group, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface FieldProps {
  children?: HellaChildren;
  orientation?: "vertical" | "horizontal" | "responsive";
  /** Renders data-invalid="true" (destructive text) and data-disabled="true" (label/title opacity) on the field. */
  disabled?: boolean;
  invalid?: boolean;
  class?: string;
}

export function Field(props: FieldProps): JSX.Element {
  return (
    <div
      role="group"
      data-slot="field"
      data-orientation={props.orientation ?? "vertical"}
      data-disabled={props.disabled ? "true" : undefined}
      data-invalid={props.invalid ? "true" : undefined}
      class={
        [
          base,
          orientation[props.orientation ?? "vertical"],
          props.class,
        ]
      }
    >
      {props.children}
    </div>
  );
}

interface FieldContentProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldContent(props: FieldContentProps): JSX.Element {
  return (
    <div
      data-slot="field-content"
      class={
        [content, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface FieldLabelProps {
  children?: HellaChildren;
  for?: string;
  class?: string;
}

export function FieldLabel(props: FieldLabelProps): JSX.Element {
  return (
    <label
      data-slot="field-label"
      for={props.for}
      class={
        [label, props.class]
      }
    >
      {props.children}
    </label>
  );
}

interface FieldTitleProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldTitle(props: FieldTitleProps): JSX.Element {
  return (
    <div
      data-slot="field-label"
      class={
        [title, props.class]
      }
    >
      {props.children}
    </div>
  );
}

interface FieldDescriptionProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldDescription(props: FieldDescriptionProps): JSX.Element {
  return (
    <p
      data-slot="field-description"
      class={
        [description, props.class]
      }
    >
      {props.children}
    </p>
  );
}

interface FieldSeparatorProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldSeparator(props: FieldSeparatorProps): JSX.Element {
  return (
    <div
      data-slot="field-separator"
      data-content={props.children ? "true" : "false"}
      class={
        [separator, props.class]
      }
    >
      <div
        role="separator"
        data-slot="field-separator-rule"
        data-orientation="horizontal"
        aria-orientation="horizontal"
        class={[separatorBase, separatorRule]}
      />
      {props.children
        ? (
          <span
            data-slot="field-separator-content"
            class={[separatorContent]}
          >
            {props.children}
          </span>
        )
        : null}
    </div>
  );
}

interface FieldErrorProps {
  children?: HellaChildren;
  errors?: Array<{ message?: string } | undefined>;
  class?: string;
}

export function FieldError(props: FieldErrorProps): JSX.Element {
  const unique = (): { message?: string }[] => {
    const seen = new Map<string | undefined, { message?: string } | undefined>();
    for (const issue of props.errors ?? []) seen.set(issue?.message, issue);
    return [...seen.values()].filter((issue) => issue !== undefined);
  };
  const hasChildren = (): boolean => {
    if (props.children == null) return false;
    if (Array.isArray(props.children)) return props.children.length > 0;
    return true;
  };
  const hasContent = (): boolean => hasChildren() || unique().length > 0;
  return (
    <div
      role="alert"
      data-slot="field-error"
      hidden={() => !hasContent()}
      class={
        [error, props.class]
      }
    >
      {() => {
        if (props.children) {
          return typeof props.children === "function" ? (props.children as () => HellaChild)() : props.children;
        }
        const errors = unique();
        if (errors.length === 1) return errors[0]!.message;
        if (errors.length === 0) return null;
        return (
          <ul class={errorList}>
            {errors.map((item) => item.message ? <li>{item.message}</li> : null)}
          </ul>
        );
      }}
    </div>
  );
}
