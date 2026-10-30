import {
  createForm,
  FormControl as HeadlessFormControl,
  FormDescription as HeadlessFormDescription,
  FormItem as HeadlessFormItem,
  FormLabel as HeadlessFormLabel,
  FormMessage as HeadlessFormMessage,
} from "@hellajs/headless";
import type {
  FormControlProps,
  FormDescriptionProps,
  FormItemProps,
  FormLabelProps,
  FormMessageProps,
} from "./form-types.js";

// @hella:styles
declare const base: string;
declare const description: string;
declare const label: string;
declare const message: string;
// @hella:end

export { createForm };

export function FormItem({ class: cls, ...attrs }: FormItemProps): JSX.Element {
  return (
    <HeadlessFormItem
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function FormLabel({ class: cls, ...attrs }: FormLabelProps): JSX.Element {
  return (
    <HeadlessFormLabel
      class={
        // @hella:compose
        [label, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function FormControl({ class: cls, ...attrs }: FormControlProps): JSX.Element {
  return (
    <HeadlessFormControl
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function FormDescription({ class: cls, ...attrs }: FormDescriptionProps): JSX.Element {
  return (
    <HeadlessFormDescription
      class={
        // @hella:compose
        [description, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function FormMessage({ class: cls, ...attrs }: FormMessageProps): JSX.Element {
  return (
    <HeadlessFormMessage
      class={
        // @hella:compose
        [message, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}
