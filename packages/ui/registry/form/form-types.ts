import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface FormItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Error flag; renders data-error="true"/"false" as the container-level hook for the error state. */
  error?: boolean | (() => boolean);
}

export interface FormLabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
  /** Error flag; renders data-error="true"/"false", aria-invalid, and the destructive text hook. */
  error?: boolean | (() => boolean);
}

export interface FormControlProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Error flag; renders aria-invalid="true" on the passthrough wrapper. */
  invalid?: boolean | (() => boolean);
  /** aria-describedby target, typically the FormDescription or FormMessage id. */
  describedBy?: string;
}

export interface FormDescriptionProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
}

export interface FormMessageProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
  /** Error messages; the first one renders. An accessor re-evaluates as validation runs. */
  errors?: string[] | (() => string[] | undefined);
}
