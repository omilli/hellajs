import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChild, HellaChildren, HellaNode } from "@hellajs/dom";

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

interface FieldSetProps extends HTMLAttributes<"fieldset"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldSet({ children, class: cls, ...attrs }: FieldSetProps): HellaNode {
  return html`
    <fieldset
      data-slot="field-set"
      class="${
        // @hella:compose
        [set, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</fieldset>
  ` as HellaNode;
}

interface FieldLegendProps extends HTMLAttributes<"legend"> {
  class?: string;
  children?: HellaChildren;
  variant?: "legend" | "label";
}

export function FieldLegend({ variant, children, class: cls, ...attrs }: FieldLegendProps): HellaNode {
  return html`
    <legend
      data-slot="field-legend"
      data-variant="${variant ?? "legend"}"
      class="${
        // @hella:compose
        [
          legend,
          legendVariants[variant ?? "legend"],
          cls,
        ]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</legend>
  ` as HellaNode;
}

interface FieldGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldGroup({ children, class: cls, ...attrs }: FieldGroupProps): HellaNode {
  return html`
    <div
      data-slot="field-group"
      class="${
        // @hella:compose
        [group, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface FieldProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "vertical" | "horizontal" | "responsive";
  /** Renders data-invalid="true" (destructive text) on the field; `disabled` (native attr) renders data-disabled="true" (label/title opacity). */
  invalid?: boolean;
}

export function Field({ orientation: orient, disabled, invalid, children, class: cls, ...attrs }: FieldProps): HellaNode {
  return html`
    <div
      role="group"
      data-slot="field"
      data-orientation="${orient ?? "vertical"}"
      data-disabled="${disabled ? "true" : undefined}"
      data-invalid="${invalid ? "true" : undefined}"
      class="${
        // @hella:compose
        [
          base,
          orientation[orient ?? "vertical"],
          cls,
        ]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface FieldContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldContent({ children, class: cls, ...attrs }: FieldContentProps): HellaNode {
  return html`
    <div
      data-slot="field-content"
      class="${
        // @hella:compose
        [content, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface FieldLabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldLabel({ children, class: cls, ...attrs }: FieldLabelProps): HellaNode {
  return html`
    <label
      data-slot="field-label"
      class="${
        // @hella:compose
        [label, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</label>
  ` as HellaNode;
}

interface FieldTitleProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldTitle({ children, class: cls, ...attrs }: FieldTitleProps): HellaNode {
  return html`
    <div
      data-slot="field-label"
      class="${
        // @hella:compose
        [title, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface FieldDescriptionProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldDescription({ children, class: cls, ...attrs }: FieldDescriptionProps): HellaNode {
  return html`
    <p
      data-slot="field-description"
      class="${
        // @hella:compose
        [description, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</p>
  ` as HellaNode;
}

interface FieldSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function FieldSeparator({ children, class: cls, ...attrs }: FieldSeparatorProps): HellaNode {
  return html`
    <div
      data-slot="field-separator"
      data-content="${children ? "true" : "false"}"
      class="${
        // @hella:compose
        [separator, cls]
        // @hella:end
      }"
      ...${attrs}
    ><div
        role="separator"
        data-slot="field-separator-rule"
        data-orientation="horizontal"
        aria-orientation="horizontal"
        class="${[separatorBase, separatorRule]}"
      />${() => children
        ? html`<span data-slot="field-separator-content" class="${[separatorContent]}">${() => children}</span>`
        : null}</div>
  ` as HellaNode;
}

interface FieldErrorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  errors?: Array<{ message?: string } | undefined>;
}

export function FieldError({ errors, children, class: cls, ...attrs }: FieldErrorProps): HellaNode {
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
  return html`
    <div
      role="alert"
      data-slot="field-error"
      hidden="${() => !hasContent()}"
      class="${
        // @hella:compose
        [error, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => {
        if (children) {
          return typeof children === "function" ? (children as () => HellaChild)() : children;
        }
        const issues = unique();
        if (issues.length === 1) return issues[0]!.message;
        if (issues.length === 0) return null;
        return html`<ul class="${errorList}">${issues.map((item) => item.message ? html`<li>${item.message}</li>` as HellaNode : null)}</ul>`;
      }}</div>
  ` as HellaNode;
}
