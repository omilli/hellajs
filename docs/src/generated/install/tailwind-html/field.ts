import { html } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";
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

interface FieldSetProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldSet(props: FieldSetProps): HellaNode {
  return html`
    <fieldset
      data-slot="field-set"
      class="${
        cn("flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3", props.class)
      }"
    >${() => props.children}</fieldset>
  ` as HellaNode;
}

interface FieldLegendProps {
  children?: HellaChildren;
  variant?: "legend" | "label";
  class?: string;
}

export function FieldLegend(props: FieldLegendProps): HellaNode {
  return html`
    <legend
      data-slot="field-legend"
      data-variant="${props.variant ?? "legend"}"
      class="${
        cn(
          "mb-3 font-medium",
          legendVariants[props.variant ?? "legend"],
          props.class,
        )
      }"
    >${() => props.children}</legend>
  ` as HellaNode;
}

interface FieldGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldGroup(props: FieldGroupProps): HellaNode {
  return html`
    <div
      data-slot="field-group"
      class="${
        cn("group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface FieldProps {
  children?: HellaChildren;
  orientation?: "vertical" | "horizontal" | "responsive";
  /** Renders data-invalid="true" (destructive text) and data-disabled="true" (label/title opacity) on the field. */
  disabled?: boolean;
  invalid?: boolean;
  class?: string;
}

export function Field(props: FieldProps): HellaNode {
  return html`
    <div
      role="group"
      data-slot="field"
      data-orientation="${props.orientation ?? "vertical"}"
      data-disabled="${props.disabled ? "true" : undefined}"
      data-invalid="${props.invalid ? "true" : undefined}"
      class="${
        cn(
          "group/field flex w-full gap-3 data-[invalid=true]:text-destructive",
          orientation[props.orientation ?? "vertical"],
          props.class,
        )
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface FieldContentProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldContent(props: FieldContentProps): HellaNode {
  return html`
    <div
      data-slot="field-content"
      class="${
        cn("group/field-content flex flex-1 flex-col gap-1.5 leading-snug", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface FieldLabelProps {
  children?: HellaChildren;
  for?: string;
  class?: string;
}

export function FieldLabel(props: FieldLabelProps): HellaNode {
  return html`
    <label
      data-slot="field-label"
      for="${props.for}"
      class="${
        cn("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10", props.class)
      }"
    >${() => props.children}</label>
  ` as HellaNode;
}

interface FieldTitleProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldTitle(props: FieldTitleProps): HellaNode {
  return html`
    <div
      data-slot="field-label"
      class="${
        cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface FieldDescriptionProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldDescription(props: FieldDescriptionProps): HellaNode {
  return html`
    <p
      data-slot="field-description"
      class="${
        cn("text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", props.class)
      }"
    >${() => props.children}</p>
  ` as HellaNode;
}

interface FieldSeparatorProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldSeparator(props: FieldSeparatorProps): HellaNode {
  return html`
    <div
      data-slot="field-separator"
      data-content="${props.children ? "true" : "false"}"
      class="${
        cn("relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2", props.class)
      }"
    ><div
        role="separator"
        data-slot="field-separator-rule"
        data-orientation="horizontal"
        aria-orientation="horizontal"
        class="${["shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", "absolute inset-0 top-1/2"]}"
      />${() => props.children
        ? html`<span data-slot="field-separator-content" class="${["relative mx-auto block w-fit bg-background px-2 text-muted-foreground"]}">${() => props.children}</span>`
        : null}</div>
  ` as HellaNode;
}

interface FieldErrorProps {
  children?: HellaChildren;
  errors?: Array<{ message?: string } | undefined>;
  class?: string;
}

export function FieldError(props: FieldErrorProps): HellaNode {
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
  return html`
    <div
      role="alert"
      data-slot="field-error"
      hidden="${() => !hasContent()}"
      class="${
        cn("text-sm font-normal text-destructive", props.class)
      }"
    >${() => {
        if (props.children) {
          return typeof props.children === "function" ? (props.children as () => HellaChild)() : props.children;
        }
        const errors = unique();
        if (errors.length === 1) return errors[0]!.message;
        if (errors.length === 0) return null;
        return html`<ul class="ml-4 flex list-disc flex-col gap-1">${errors.map((item) => item.message ? html`<li>${item.message}</li>` as HellaNode : null)}</ul>`;
      }}</div>
  ` as HellaNode;
}
