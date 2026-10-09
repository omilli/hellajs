import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const content: string;
declare const description: string;
declare const header: string;
declare const media: string;
declare const mediaVariants: Record<string, string>;
declare const title: string;
// @hella:end

interface EmptyPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Empty({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty"
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

export function EmptyHeader({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-header"
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

interface EmptyMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "icon";
}

export function EmptyMedia({ variant, children, class: cls, ...attrs }: EmptyMediaProps): JSX.Element {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant ?? "default"}
      class={
        // @hella:compose
        [
          media,
          mediaVariants[variant ?? "default"],
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

export function EmptyTitle({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-title"
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

export function EmptyDescription({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-description"
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

export function EmptyContent({ children, class: cls, ...attrs }: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-content"
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
