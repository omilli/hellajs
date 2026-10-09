import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const action: string;
declare const base: string;
declare const content: string;
declare const description: string;
declare const footer: string;
declare const header: string;
declare const title: string;
// @hella:end

interface CardPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Card({ children, class: cls, ...attrs }: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, class: cls, ...attrs }: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-header"
      class={
        // @hella:compose
        [header, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children, class: cls, ...attrs }: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-title"
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

export function CardDescription({ children, class: cls, ...attrs }: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-description"
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

export function CardAction({ children, class: cls, ...attrs }: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-action"
      class={
        // @hella:compose
        [action, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, class: cls, ...attrs }: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-content"
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function CardFooter({ children, class: cls, ...attrs }: CardPartProps): JSX.Element {
  return (
    <div
      data-slot="card-footer"
      class={
        // @hella:compose
        [footer, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
