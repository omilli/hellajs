import { isFunction, signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type {
  FormControlProps,
  FormController,
  FormDescriptionProps,
  FormItemProps,
  FormLabelProps,
  FormMessageProps,
  FormOptions,
} from "./types/components";

/**
 * Creates a signals-native form controller: one writable signal per field,
 * plus the errors/touched/dirty state and the submit path. Validators run on
 * blur, on `setField` after the field is touched, and on submit; the form
 * parts read the controller through explicit props (no context).
 *
 * ```tsx
 * const form = createForm({ email: "" }, { validators: { email: (v) => (v.includes("@") ? null : "Invalid email") } });
 *
 * <form onSubmit={form.handleSubmit((values) => save(values))}>
 *   <FormItem error={() => form.errors().email != null}>
 *     <FormLabel for="email" error={() => form.errors().email != null}>Email</FormLabel>
 *     <FormControl invalid={() => form.errors().email != null}>
 *       <input
 *         id="email"
 *         value={() => form.values.email()}
 *         on:input={(e) => form.setField("email", (e.target as HTMLInputElement).value)}
 *       />
 *     </FormControl>
 *     <FormMessage errors={() => (form.errors().email ? [form.errors().email!] : [])} />
 *   </FormItem>
 * </form>
 * ```
 *
 * @param initial The initial field values; the key set is fixed at creation.
 * @param options The per-field validators.
 * @returns The controller: `values`, `errors`, `touched`, `dirty`, `setField`, `blur`, `validate`, `reset`, `handleSubmit`.
 * @template T The form's field shape.
 */
export function createForm<T extends object>(
  initial: T,
  options?: FormOptions<T>,
): FormController<T> {
  const keys = Object.keys(initial) as (keyof T)[];
  const values = {} as { [K in keyof T]: Signal<T[K]> };
  let i = 0;
  while (i < keys.length) {
    const key = keys[i]!;
    values[key] = signal(initial[key]);
    i++;
  }
  const errors = signal<Partial<Record<keyof T, string>>>({});
  const touched = signal<Partial<Record<keyof T, boolean>>>({});
  const dirty = signal(false);

  const snapshot = (): T => {
    const out = {} as T;
    let i = 0;
    while (i < keys.length) {
      const key = keys[i]!;
      out[key] = values[key]();
      i++;
    }
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
    let i = 0;
    while (i < keys.length) {
      const key = keys[i]!;
      const validator = options?.validators?.[key];
      const outcome = validator ? validator(values[key](), current) : null;
      if (outcome != null) next[key] = outcome;
      i++;
    }
    errors(next);
    return Object.keys(next).length === 0;
  };

  const reset = (): void => {
    let i = 0;
    while (i < keys.length) {
      const key = keys[i]!;
      values[key](initial[key]);
      i++;
    }
    errors({});
    touched({});
    dirty(false);
  };

  const handleSubmit =
    (onValid: (values: T) => void) =>
    (e?: Event): void => {
      e?.preventDefault();
      const clean = validate();
      const nextTouched = { ...touched() };
      let i = 0;
      while (i < keys.length) {
        nextTouched[keys[i]!] = true;
        i++;
      }
      touched(nextTouched);
      if (clean) onValid(snapshot());
    };

  return { values, errors, touched, dirty, setField, blur, validate, reset, handleSubmit };
}

/**
 * One field's grouping container: renders `data-error="true"/"false"` from the
 * `error` flag (plain boolean or reactive accessor) as the container-level
 * hook for the error state. Styling stays in the wrapper.
 *
 * ```tsx
 * <FormItem error={() => form.errors().email != null}>
 *   ...the label, control, description, and message parts
 * </FormItem>
 * ```
 */
export function FormItem({ error, children, class: cls, ...attrs }: FormItemProps): JSX.Element {
  const hasError = (): boolean => (isFunction(error) ? error() : error) === true;
  return (
    <div data-slot="form-item" data-error={hasError() ? "true" : "false"} class={cls} {...attrs}>
      {children}
    </div>
  );
}

/**
 * A field's label: renders `data-required` and the `for` target verbatim, and
 * mirrors the `error` flag (plain boolean or reactive accessor) as
 * `data-error` plus `aria-invalid` for the destructive text hook.
 *
 * ```tsx
 * <FormLabel for="email" error={() => form.errors().email != null}>Email</FormLabel>
 * ```
 */
export function FormLabel({
  required,
  for: htmlFor,
  error,
  children,
  class: cls,
  ...attrs
}: FormLabelProps): JSX.Element {
  const hasError = (): boolean => (isFunction(error) ? error() : error) === true;
  const invalid = (): "true" | undefined => (hasError() ? "true" : undefined);
  return (
    <label
      data-slot="form-label"
      data-required={required ? "true" : undefined}
      for={htmlFor}
      aria-invalid={invalid()}
      data-error={hasError() ? "true" : "false"}
      class={cls}
      {...attrs}
    >
      {children}
    </label>
  );
}

/**
 * A field's control wrapper: renders `aria-invalid` from the `invalid` flag
 * (plain boolean or reactive accessor) and `aria-describedby` from
 * `describedBy`; everything else passes through to the composed control.
 *
 * ```tsx
 * <FormControl invalid={() => form.errors().email != null} describedBy="email-message">
 *   <input id="email" />
 * </FormControl>
 * ```
 */
export function FormControl({
  invalid,
  describedBy,
  children,
  class: cls,
  ...attrs
}: FormControlProps): JSX.Element {
  const isInvalid = (): boolean => (isFunction(invalid) ? invalid() : invalid) === true;
  return (
    <div
      data-slot="form-control"
      aria-invalid={isInvalid() ? "true" : undefined}
      aria-describedby={describedBy}
      class={cls}
      {...attrs}
    >
      {children}
    </div>
  );
}

/**
 * A field's helper text: renders the given `id` so the control's
 * `describedBy` can target it. Styling stays in the wrapper.
 *
 * ```tsx
 * <FormDescription id="email-note">We only use this for sign-in.</FormDescription>
 * ```
 */
export function FormDescription({
  id,
  children,
  class: cls,
  ...attrs
}: FormDescriptionProps): JSX.Element {
  return (
    <p data-slot="form-description" id={id} class={cls} {...attrs}>
      {children}
    </p>
  );
}

/**
 * A field's validation message: renders the first error from `errors` (plain
 * array or reactive accessor) under `role="alert"`, hides while the list is
 * empty and no fallback children are given, and renders the fallback children
 * otherwise.
 *
 * ```tsx
 * <FormMessage errors={() => (form.errors().email ? [form.errors().email!] : [])} />
 * ```
 */
export function FormMessage({
  errors,
  children,
  class: cls,
  ...attrs
}: FormMessageProps): JSX.Element {
  const messages = (): string[] => (isFunction(errors) ? errors() : errors) ?? [];
  const hasContent = (): boolean => messages().length > 0 || children != null;
  return (
    <p role="alert" data-slot="form-message" hidden={() => !hasContent()} class={cls} {...attrs}>
      {() => {
        const list = messages();
        return list.length > 0 ? list[0] : children;
      }}
    </p>
  );
}
