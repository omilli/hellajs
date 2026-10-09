import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

const legendVariants = {
  legend: "data-[variant=legend]:text-base",
  label: "data-[variant=label]:text-sm",
};

const orientation = {
  vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
  horizontal: "flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
  responsive: "flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
};

interface FieldSetProps extends HTMLAttributes<"fieldset"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldSet({ children, class: cls, ...attrs }: FieldSetProps): JSX.Element {
  return (
    <fieldset
      data-slot="field-set"
      class={
        cn("flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3", cls)
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
        cn(
          "mb-3 font-medium",
          legendVariants[variant ?? "legend"],
          cls,
        )
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
        cn("group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4", cls)
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
        cn(
          "group/field flex w-full gap-3 data-[invalid=true]:text-destructive",
          orientation[orient ?? "vertical"],
          cls,
        )
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
        cn("group/field-content flex flex-1 flex-col gap-1.5 leading-snug", cls)
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
        cn("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10", cls)
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
        cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50", cls)
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
        cn("text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", cls)
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
        cn("relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2", cls)
      }
      {...attrs}
    >
      <div
        role="separator"
        data-slot="field-separator-rule"
        data-orientation="horizontal"
        aria-orientation="horizontal"
        class={["shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", "absolute inset-0 top-1/2"]}
      />
      {children
        ? (
          <span
            data-slot="field-separator-content"
            class={["relative mx-auto block w-fit bg-background px-2 text-muted-foreground"]}
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
        cn("text-sm font-normal text-destructive", cls)
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
          <ul class="ml-4 flex list-disc flex-col gap-1">
            {issues.map((item) => item.message ? <li>{item.message}</li> : null)}
          </ul>
        );
      }}
    </div>
  );
}
