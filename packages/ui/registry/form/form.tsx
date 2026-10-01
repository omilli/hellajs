import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const description: string;
declare const label: string;
declare const message: string;
// @hella:end

/** Per-field validator: receives the field value and the full values snapshot, returns the error message or null when the value is clean. */
type FormValidator<T> = (value: T[keyof T], values: T) => string | null;

/** Options bag for createForm. */
interface FormOptions<T> {
  /** Per-field validators; a field without one is always clean. */
  validators?: Partial<Record<keyof T, FormValidator<T>>>;
}

/** Signals controller createForm returns; the form parts read it through explicit props (no context). */
interface FormController<T extends object> {
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

/** Signals-native form controller replacing react-hook-form's provider: values, errors, touched, and dirty are plain signals, validators run on blur, on setField after touch, and on submit. */
export function createForm<T extends object>(initial: T, options?: FormOptions<T>): FormController<T> {
  const keys = Object.keys(initial) as (keyof T)[];
  const values = {} as { [K in keyof T]: Signal<T[K]> };
  for (const key of keys) values[key] = signal(initial[key]);
  const errors = signal<Partial<Record<keyof T, string>>>({});
  const touched = signal<Partial<Record<keyof T, boolean>>>({});
  const dirty = signal(false);

  const snapshot = (): T => {
    const out = {} as T;
    for (const key of keys) out[key] = values[key]();
    return out;
  };

  const syncDirty = (): void => {
    dirty(keys.some((key) => values[key]() !== initial[key]));
  };

  const validateField = (key: keyof T): void => {
    const validator = options?.validators?.[key];
    const outcome = validator ? validator(values[key](), snapshot()) : null;
    const next = { ...errors() };
    if (outcome == null) delete next[key];
    else next[key] = outcome;
    errors(next);
  };

  const setField = <K extends keyof T>(key: K, value: T[K]): void => {
    values[key](value);
    syncDirty();
    if (touched()[key]) validateField(key);
  };

  const blur = (key: keyof T): void => {
    touched({ ...touched(), [key]: true });
    validateField(key);
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof T, string>> = {};
    const current = snapshot();
    for (const key of keys) {
      const validator = options?.validators?.[key];
      const outcome = validator ? validator(values[key](), current) : null;
      if (outcome != null) next[key] = outcome;
    }
    errors(next);
    return Object.keys(next).length === 0;
  };

  const reset = (): void => {
    for (const key of keys) values[key](initial[key]);
    errors({});
    touched({});
    dirty(false);
  };

  const handleSubmit = (onValid: (values: T) => void) => (e?: Event): void => {
    e?.preventDefault();
    const clean = validate();
    const nextTouched = { ...touched() };
    for (const key of keys) nextTouched[key] = true;
    touched(nextTouched);
    if (clean) onValid(snapshot());
  };

  return { values, errors, touched, dirty, setField, blur, validate, reset, handleSubmit };
}

interface FormItemProps {
  /** Error flag; renders data-error="true"/"false" as the container-level hook for the error state. */
  error?: boolean | (() => boolean);
  children?: HellaChildren;
  class?: string;
}

export function FormItem(props: FormItemProps): JSX.Element {
  const hasError = (): boolean => (typeof props.error === "function" ? props.error() : props.error) === true;
  return (
    <div
      data-slot="form-item"
      data-error={hasError() ? "true" : "false"}
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface FormLabelProps {
  /** Renders data-required="true" as the styling hook for the required marker. */
  required?: boolean;
  /** Error flag; renders data-error="true"/"false", aria-invalid, and the destructive text hook. */
  error?: boolean | (() => boolean);
  for?: string;
  children?: HellaChildren;
}

export function FormLabel(props: FormLabelProps): JSX.Element {
  const hasError = (): boolean => (typeof props.error === "function" ? props.error() : props.error) === true;
  const invalid = (): "true" | undefined => (hasError() ? "true" : undefined);
  return (
    <label
      data-slot="form-label"
      data-required={props.required ? "true" : undefined}
      for={props.for}
      aria-invalid={invalid()}
      data-error={hasError() ? "true" : "false"}
      class={
        // @hella:compose
        [label]
        // @hella:end
      }
    >
      {props.children}
    </label>
  );
}

interface FormControlProps {
  /** Error flag; renders aria-invalid="true" on the passthrough wrapper. */
  invalid?: boolean | (() => boolean);
  /** aria-describedby target, typically the FormDescription or FormMessage id. */
  describedBy?: string;
  children?: HellaChildren;
}

export function FormControl(props: FormControlProps): JSX.Element {
  const isInvalid = (): boolean => (typeof props.invalid === "function" ? props.invalid() : props.invalid) === true;
  return (
    <div
      data-slot="form-control"
      aria-invalid={isInvalid() ? "true" : undefined}
      aria-describedby={props.describedBy}
    >
      {props.children}
    </div>
  );
}

interface FormDescriptionProps {
  /** Id the matching FormControl points its aria-describedby at. */
  id?: string;
  children?: HellaChildren;
}

export function FormDescription(props: FormDescriptionProps): JSX.Element {
  return (
    <p
      data-slot="form-description"
      id={props.id}
      class={
        // @hella:compose
        [description]
        // @hella:end
      }
    >
      {props.children}
    </p>
  );
}

interface FormMessageProps {
  /** Error messages; the first one renders. An accessor re-evaluates as validation runs. */
  errors?: string[] | (() => string[] | undefined);
  /** Fallback content rendered when there are no errors. */
  children?: HellaChildren;
}

export function FormMessage(props: FormMessageProps): JSX.Element {
  const messages = (): string[] => (typeof props.errors === "function" ? props.errors() : props.errors) ?? [];
  const hasContent = (): boolean => messages().length > 0 || props.children != null;
  return (
    <p
      role="alert"
      data-slot="form-message"
      hidden={() => !hasContent()}
      class={
        // @hella:compose
        [message]
        // @hella:end
      }
    >
      {() => {
        const list = messages();
        return list.length > 0 ? list[0] : props.children;
      }}
    </p>
  );
}
