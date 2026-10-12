import type { Signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type FormValidator<T> = (value: T[keyof T], values: T) => string | null;

export interface FormOptions<T> {
  /** Per-field validators; a field without one is always clean. */
  validators?: Partial<Record<keyof T, FormValidator<T>>>;
}

export interface FormController<T extends object> {
  /** One writable signal per field. */
  values: { [K in keyof T]: Signal<T[K]> };
  /** Current validation messages keyed by field. */
  errors: Signal<Partial<Record<keyof T, string>>>;
  /** Fields that have blurred or been submitted. */
  touched: Signal<Partial<Record<keyof T, boolean>>>;
  /** True while any field differs from its initial value. */
  dirty: Signal<boolean>;
  /** Writes the field value, retracks dirty, and revalidates the field when it is already touched. */
  setField: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Marks the field touched and validates it. */
  blur: (key: keyof T) => void;
  /** Validates every field; returns true when no messages remain. */
  validate: () => boolean;
  /** Restores every field to its initial value and clears errors, touched, and dirty. */
  reset: () => void;
  /** Validates all and marks all touched; calls onValid with the values only when clean. The optional event is preventDefaulted. */
  handleSubmit: (onValid: (values: T) => void) => (e?: Event) => void;
}

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
