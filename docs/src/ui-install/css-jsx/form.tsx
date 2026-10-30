import {
  createForm,
  FormControl as HeadlessFormControl,
  FormDescription as HeadlessFormDescription,
  FormItem as HeadlessFormItem,
  FormLabel as HeadlessFormLabel,
  FormMessage as HeadlessFormMessage,
} from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface FormItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Error flag; renders data-error="true"/"false" as the container-level hook for the error state. */
  error?: boolean | (() => boolean);
}

interface FormLabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
  /** Error flag; renders data-error="true"/"false", aria-invalid, and the destructive text hook. */
  error?: boolean | (() => boolean);
}

interface FormControlProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Error flag; renders aria-invalid="true" on the passthrough wrapper. */
  invalid?: boolean | (() => boolean);
  /** aria-describedby target, typically the FormDescription or FormMessage id. */
  describedBy?: string;
}

interface FormDescriptionProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
}

interface FormMessageProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
  /** Error messages; the first one renders. An accessor re-evaluates as validation runs. */
  errors?: string[] | (() => string[] | undefined);
}

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("form-item", {
  display: "grid",
  gap: "0.5rem",
});

const label = style("form-label", {
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1",
  userSelect: "none",
  "&:is(.group[data-disabled='true'] *)": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:is(.peer:disabled ~ *)": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[data-error='true']": {
    color: tokens.destructive,
  },
});

const description = style("form-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
});

const message = style("form-message", {
  color: tokens.destructive,
  fontSize: "0.875rem",
});

export { createForm };

export function FormItem({ class: cls, ...attrs }: FormItemProps): JSX.Element {
  return (
    <HeadlessFormItem
      class={
        [base, cls]
      }
      {...attrs}
    />
  );
}

export function FormLabel({ class: cls, ...attrs }: FormLabelProps): JSX.Element {
  return (
    <HeadlessFormLabel
      class={
        [label, cls]
      }
      {...attrs}
    />
  );
}

export function FormControl({ class: cls, ...attrs }: FormControlProps): JSX.Element {
  return (
    <HeadlessFormControl
      class={
        [cls]
      }
      {...attrs}
    />
  );
}

export function FormDescription({ class: cls, ...attrs }: FormDescriptionProps): JSX.Element {
  return (
    <HeadlessFormDescription
      class={
        [description, cls]
      }
      {...attrs}
    />
  );
}

export function FormMessage({ class: cls, ...attrs }: FormMessageProps): JSX.Element {
  return (
    <HeadlessFormMessage
      class={
        [message, cls]
      }
      {...attrs}
    />
  );
}
