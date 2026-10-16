import type { AlertProps, AlertPartProps } from "./alert-types.js";

// @hella:styles
declare const base: string;
declare const description: string;
declare const title: string;
declare const variants: Record<string, string>;
// @hella:end

export function Alert({ variant, children, class: cls, ...attrs }: AlertProps): JSX.Element {
  return (
    <div
      data-slot="alert"
      role="alert"
      class={
        // @hella:compose
        [base, variants[variant ?? "default"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function AlertTitle({ children, class: cls, ...attrs }: AlertPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-title"
      class={
        // @hella:compose
        [title, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ children, class: cls, ...attrs }: AlertPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-description"
      class={
        // @hella:compose
        [description, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
