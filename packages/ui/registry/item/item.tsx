import type {
  ItemGroupProps,
  ItemSeparatorProps,
  ItemProps,
  ItemMediaProps,
  ItemContentProps,
  ItemTitleProps,
  ItemDescriptionProps,
  ItemActionsProps,
  ItemHeaderProps,
  ItemFooterProps,
} from "./item-types.js";

// @hella:styles
declare const actions: string;
declare const base: string;
declare const content: string;
declare const description: string;
declare const footer: string;
declare const group: string;
declare const header: string;
declare const media: string;
declare const mediaVariants: Record<string, string>;
declare const separator: string;
declare const separatorBase: string;
declare const sizes: Record<string, string>;
declare const title: string;
declare const variants: Record<string, string>;
// @hella:end

export function ItemGroup({ children, class: cls, ...attrs }: ItemGroupProps): JSX.Element {
  return (
    <div
      role="list"
      data-slot="item-group"
      class={
        // @hella:compose
        [group, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function ItemSeparator({ class: cls, ...attrs }: ItemSeparatorProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="item-separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class={
        // @hella:compose
        [separatorBase, separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function Item({
  variant,
  size,
  selected,
  children,
  class: cls,
  ...attrs
}: ItemProps): JSX.Element {
  const selectedAttr = (): "true" | "false" =>
    (typeof selected === "function" ? selected() : selected) ? "true" : "false";
  return (
    <div
      data-slot="item"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      data-selected={selectedAttr}
      aria-selected={selectedAttr}
      class={
        // @hella:compose
        [base, variants[variant ?? "default"], sizes[size ?? "default"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function ItemMedia({
  variant,
  children,
  class: cls,
  ...attrs
}: ItemMediaProps): JSX.Element {
  return (
    <div
      data-slot="item-media"
      data-variant={variant ?? "default"}
      class={
        // @hella:compose
        [media, mediaVariants[variant ?? "default"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function ItemContent({ children, class: cls, ...attrs }: ItemContentProps): JSX.Element {
  return (
    <div
      data-slot="item-content"
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

export function ItemTitle({ children, class: cls, ...attrs }: ItemTitleProps): JSX.Element {
  return (
    <div
      data-slot="item-title"
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

export function ItemDescription({
  children,
  class: cls,
  ...attrs
}: ItemDescriptionProps): JSX.Element {
  return (
    <p
      data-slot="item-description"
      class={
        // @hella:compose
        [description, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </p>
  );
}

export function ItemActions({ children, class: cls, ...attrs }: ItemActionsProps): JSX.Element {
  return (
    <div
      data-slot="item-actions"
      class={
        // @hella:compose
        [actions, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function ItemHeader({ children, class: cls, ...attrs }: ItemHeaderProps): JSX.Element {
  return (
    <div
      data-slot="item-header"
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

export function ItemFooter({ children, class: cls, ...attrs }: ItemFooterProps): JSX.Element {
  return (
    <div
      data-slot="item-footer"
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
