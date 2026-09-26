import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const content: string;
declare const description: string;
declare const header: string;
declare const media: string;
declare const mediaVariants: Record<string, string>;
declare const title: string;
// @hella:end

interface EmptyPartProps {
  children?: HellaChildren;
  class?: string;
}

export default function Empty(props: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty"
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

export function EmptyHeader(props: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-header"
      class={
        // @hella:compose
        [header, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface EmptyMediaProps {
  children?: HellaChildren;
  variant?: "default" | "icon";
  class?: string;
}

export function EmptyMedia(props: EmptyMediaProps): JSX.Element {
  return (
    <div
      data-slot="empty-icon"
      data-variant={props.variant ?? "default"}
      class={
        // @hella:compose
        [
          media,
          mediaVariants[props.variant ?? "default"],
          props.class,
        ]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

export function EmptyTitle(props: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-title"
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

export function EmptyDescription(props: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-description"
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

export function EmptyContent(props: EmptyPartProps): JSX.Element {
  return (
    <div
      data-slot="empty-content"
      class={
        // @hella:compose
        [content, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}
