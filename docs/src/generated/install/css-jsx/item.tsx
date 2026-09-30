import type { HellaChildren } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

const group = style({
  display: "flex",
  flexDirection: "column",
}, { label: "hella-item-group", layer: "hella" });

const separatorBase = style({
  backgroundColor: "var(--border)",
  flexShrink: "0",
  "&[data-orientation='horizontal']": {
    height: "1px",
    width: "100%",
  },
  "&[data-orientation='vertical']": {
    height: "100%",
    width: "1px",
  },
}, { label: "hella-item-separator", layer: "hella" });

const separator = style({
  marginBlock: "0",
}, { label: "hella-item-separator-override", layer: "hella" });

const base = style({
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "calc(var(--radius) * 0.8)",
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "color 100ms cubic-bezier(0.4, 0, 0.2, 1), background-color 100ms cubic-bezier(0.4, 0, 0.2, 1), border-color 100ms cubic-bezier(0.4, 0, 0.2, 1), outline-color 100ms cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 100ms cubic-bezier(0.4, 0, 0.2, 1), fill 100ms cubic-bezier(0.4, 0, 0.2, 1), stroke 100ms cubic-bezier(0.4, 0, 0.2, 1)",
  "& a": {
    transition: "color 100ms cubic-bezier(0.4, 0, 0.2, 1), background-color 100ms cubic-bezier(0.4, 0, 0.2, 1), border-color 100ms cubic-bezier(0.4, 0, 0.2, 1), outline-color 100ms cubic-bezier(0.4, 0, 0.2, 1), text-decoration-color 100ms cubic-bezier(0.4, 0, 0.2, 1), fill 100ms cubic-bezier(0.4, 0, 0.2, 1), stroke 100ms cubic-bezier(0.4, 0, 0.2, 1)",
  },
  "& a:hover": {
    backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "hella-item", layer: "hella" });

const variants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "hella-item-default", layer: "hella" }),
  outline: style({
    borderColor: "var(--border)",
  }, { label: "hella-item-outline", layer: "hella" }),
  muted: style({
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  }, { label: "hella-item-muted", layer: "hella" }),
};

const sizes = {
  default: style({
    gap: "1rem",
    padding: "1rem",
  }, { label: "hella-item-size-default", layer: "hella" }),
  sm: style({
    gap: "0.625rem",
    paddingBlock: "0.75rem",
    paddingInline: "1rem",
  }, { label: "hella-item-size-sm", layer: "hella" }),
};

const media = style({
  alignItems: "center",
  display: "flex",
  flexShrink: "0",
  gap: "0.5rem",
  justifyContent: "center",
  "& svg": {
    pointerEvents: "none",
  },
}, { label: "hella-item-media", layer: "hella" });

const mediaVariants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "hella-item-media-default", layer: "hella" }),
  icon: style({
    backgroundColor: "var(--muted)",
    border: "1px solid var(--border)",
    borderRadius: "calc(var(--radius) * 0.6)",
    height: "2rem",
    width: "2rem",
    "& svg:not([class*='size-'])": {
      height: "1rem",
      width: "1rem",
    },
  }, { label: "hella-item-media-icon", layer: "hella" }),
  image: style({
    borderRadius: "calc(var(--radius) * 0.6)",
    height: "2.5rem",
    overflow: "hidden",
    width: "2.5rem",
    "& img": {
      height: "100%",
      objectFit: "cover",
      width: "100%",
    },
  }, { label: "hella-item-media-image", layer: "hella" }),
};

const content = style({
  display: "flex",
  flex: "1 1 0%",
  flexDirection: "column",
  gap: "0.25rem",
  "& + [data-slot='item-content']": {
    flex: "none",
  },
}, { label: "hella-item-content", layer: "hella" });

const title = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1.625",
  width: "fit-content",
}, { label: "hella-item-title", layer: "hella" });

const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  fontWeight: "400",
  lineHeight: "1.25rem",
  overflow: "hidden",
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: "2",
  textWrap: "balance",
  "& > a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "4px",
  },
  "& > a:hover": {
    color: "var(--primary)",
  },
}, { label: "hella-item-description", layer: "hella" });

const actions = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
}, { label: "hella-item-actions", layer: "hella" });

const header = style({
  alignItems: "center",
  display: "flex",
  flexBasis: "100%",
  gap: "0.5rem",
  justifyContent: "space-between",
}, { label: "hella-item-header", layer: "hella" });

const footer = style({
  alignItems: "center",
  display: "flex",
  flexBasis: "100%",
  gap: "0.5rem",
  justifyContent: "space-between",
}, { label: "hella-item-footer", layer: "hella" });

css({
  "@layer hella": {
    "[data-slot='item']:has([data-slot='item-description']) [data-slot='item-media']": {
      alignSelf: "flex-start",
      transform: "translateY(0.125rem)",
    },
  },
});

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
        [group, props.class]
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
        [
          separatorBase,
          separator,
          props.class,
        ]
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
        [
          base,
          variants[props.variant ?? "default"],
          sizes[props.size ?? "default"],
          props.class,
        ]
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
        [
          media,
          mediaVariants[props.variant ?? "default"],
          props.class,
        ]
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
        [content, props.class]
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
        [title, props.class]
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
        [description, props.class]
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
        [actions, props.class]
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
        [header, props.class]
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
        [footer, props.class]
      }
    >
      {props.children}
    </div>
  );
}
