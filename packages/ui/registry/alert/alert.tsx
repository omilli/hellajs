import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const description: string;
declare const title: string;
declare const variants: Record<string, string>;
// @hella:end

interface AlertProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive";
}

export default function Alert({ variant, children, class: cls, ...attrs }: AlertProps): JSX.Element {
  return (
    <div
      data-slot="alert"
      role="alert"
      class={
        // @hella:compose
        [
          base,
          variants[variant ?? "default"],
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface AlertPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
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
