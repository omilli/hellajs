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
import { cn } from "./cn.js";

export { createForm };

export function FormItem({ class: cls, ...attrs }: FormItemProps): JSX.Element {
  return (
    <HeadlessFormItem
      class={
        cn("grid gap-2", cls)
      }
      {...attrs}
    />
  );
}

export function FormLabel({ class: cls, ...attrs }: FormLabelProps): JSX.Element {
  return (
    <HeadlessFormLabel
      class={
        cn("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 data-[error=true]:text-destructive", cls)
      }
      {...attrs}
    />
  );
}

export function FormControl({ class: cls, ...attrs }: FormControlProps): JSX.Element {
  return (
    <HeadlessFormControl
      class={
        cn(cls)
      }
      {...attrs}
    />
  );
}

export function FormDescription({ class: cls, ...attrs }: FormDescriptionProps): JSX.Element {
  return (
    <HeadlessFormDescription
      class={
        cn("text-sm text-muted-foreground", cls)
      }
      {...attrs}
    />
  );
}

export function FormMessage({ class: cls, ...attrs }: FormMessageProps): JSX.Element {
  return (
    <HeadlessFormMessage
      class={
        cn("text-sm text-destructive", cls)
      }
      {...attrs}
    />
  );
}
