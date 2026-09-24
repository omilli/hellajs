import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface ItemGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemGroup(props: ItemGroupProps): JSX.Element {
  return (
    <div
      role="list"
      data-slot="item-group"
      class={
        // @hella:compose
        [group, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface ItemSeparatorProps {
  class?: string;
}

export function ItemSeparator(props: ItemSeparatorProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="item-separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class={
        // @hella:compose
        [
          separatorBase,
          separator,
          props.class,
        ]
        // @hella:end
      }
    />
  );
}

interface ItemProps {
  children?: HellaChildren;
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  /** Static boolean or reactive fn; drives data-selected + aria-selected (omitted when absent). */
  selected?: boolean | (() => boolean);
  class?: string;
}

export function Item(props: ItemProps): JSX.Element {
  const selectedAttr = (): "true" | "false" =>
    (typeof props.selected === "function" ? props.selected() : props.selected) ? "true" : "false";
  return (
    <div
      data-slot="item"
      data-variant={props.variant ?? "default"}
      data-size={props.size ?? "default"}
      data-selected={selectedAttr}
      aria-selected={selectedAttr}
      class={
        // @hella:compose
        [
          base,
          variants[props.variant ?? "default"],
          sizes[props.size ?? "default"],
          props.class,
        ]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface ItemMediaProps {
  children?: HellaChildren;
  variant?: "default" | "icon" | "image";
  class?: string;
}

export function ItemMedia(props: ItemMediaProps): JSX.Element {
  return (
    <div
      data-slot="item-media"
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

interface ItemContentProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemContent(props: ItemContentProps): JSX.Element {
  return (
    <div
      data-slot="item-content"
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

interface ItemTitleProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemTitle(props: ItemTitleProps): JSX.Element {
  return (
    <div
      data-slot="item-title"
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

interface ItemDescriptionProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemDescription(props: ItemDescriptionProps): JSX.Element {
  return (
    <p
      data-slot="item-description"
      class={
        // @hella:compose
        [description, props.class]
        // @hella:end
      }
    >
      {props.children}
    </p>
  );
}

interface ItemActionsProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemActions(props: ItemActionsProps): JSX.Element {
  return (
    <div
      data-slot="item-actions"
      class={
        // @hella:compose
        [actions, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface ItemHeaderProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemHeader(props: ItemHeaderProps): JSX.Element {
  return (
    <div
      data-slot="item-header"
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

interface ItemFooterProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemFooter(props: ItemFooterProps): JSX.Element {
  return (
    <div
      data-slot="item-footer"
      class={
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}
