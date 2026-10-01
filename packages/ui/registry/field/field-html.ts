import { html } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const content: string;
declare const description: string;
declare const error: string;
declare const errorList: string;
declare const group: string;
declare const label: string;
declare const legend: string;
declare const legendVariants: Record<string, string>;
declare const orientation: Record<string, string>;
declare const separator: string;
declare const separatorBase: string;
declare const separatorContent: string;
declare const separatorRule: string;
declare const set: string;
declare const title: string;
// @hella:end

interface FieldSetProps {
  children?: HellaChildren;
  class?: string;
}

export function FieldSet(props: FieldSetProps): HellaNode {
  return html`
    <fieldset
      data-slot="field-set"
      class="${
        // @hella:compose
        [set, props.class]
        // @hella:end
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
        // @hella:compose
        [
          legend,
          legendVariants[props.variant ?? "legend"],
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [group, props.class]
        // @hella:end
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
        // @hella:compose
        [
          base,
          orientation[props.orientation ?? "vertical"],
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [content, props.class]
        // @hella:end
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
        // @hella:compose
        [label, props.class]
        // @hella:end
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
        // @hella:compose
        [title, props.class]
        // @hella:end
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
        // @hella:compose
        [description, props.class]
        // @hella:end
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
        // @hella:compose
        [separator, props.class]
        // @hella:end
      }"
    ><div
        role="separator"
        data-slot="field-separator-rule"
        data-orientation="horizontal"
        aria-orientation="horizontal"
        class="${[separatorBase, separatorRule]}"
      />${() => props.children
        ? html`<span data-slot="field-separator-content" class="${[separatorContent]}">${() => props.children}</span>`
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
        // @hella:compose
        [error, props.class]
        // @hella:end
      }"
    >${() => {
        if (props.children) {
          return typeof props.children === "function" ? (props.children as () => HellaChild)() : props.children;
        }
        const errors = unique();
        if (errors.length === 1) return errors[0]!.message;
        if (errors.length === 0) return null;
        return html`<ul class="${errorList}">${errors.map((item) => item.message ? html`<li>${item.message}</li>` as HellaNode : null)}</ul>`;
      }}</div>
  ` as HellaNode;
}
