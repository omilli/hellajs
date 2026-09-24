import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface AlertProps {
  children?: HellaChildren;
  variant?: "default" | "destructive";
  class?: string;
}

export default function Alert(props: AlertProps): JSX.Element {
  return (
    <div
      data-slot="alert"
      role="alert"
      class={
        // @hella:compose
        [
          base,
          variants[props.variant ?? "default"],
          props.class,
        ]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface AlertPartProps {
  children?: HellaChildren;
  class?: string;
}

export function AlertTitle(props: AlertPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-title"
      class={
        // @hella:compose
        [title, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

export function AlertDescription(props: AlertPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-description"
      class={
        // @hella:compose
        [description, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}
