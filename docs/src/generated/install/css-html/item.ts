import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

const group = style("item-group", {
  display: "flex",
  flexDirection: "column",
});

const separatorBase = style("item-separator", {
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
});

const separator = style("item-separator-override", {
  marginBlock: "0",
});

const base = style("item", {
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
});

const variants = {
  default: style("item-default", {
    backgroundColor: "transparent",
  }),
  outline: style("item-outline", {
    borderColor: "var(--border)",
  }),
  muted: style("item-muted", {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  }),
};

const sizes = {
  default: style("item-size-default", {
    gap: "1rem",
    padding: "1rem",
  }),
  sm: style("item-size-sm", {
    gap: "0.625rem",
    paddingBlock: "0.75rem",
    paddingInline: "1rem",
  }),
};

const media = style("item-media", {
  alignItems: "center",
  display: "flex",
  flexShrink: "0",
  gap: "0.5rem",
  justifyContent: "center",
  "& svg": {
    pointerEvents: "none",
  },
});

const mediaVariants = {
  default: style("item-media-default", {
    backgroundColor: "transparent",
  }),
  icon: style("item-media-icon", {
    backgroundColor: "var(--muted)",
    border: "1px solid var(--border)",
    borderRadius: "calc(var(--radius) * 0.6)",
    height: "2rem",
    width: "2rem",
    "& svg:not([class*='size-'])": {
      height: "1rem",
      width: "1rem",
    },
  }),
  image: style("item-media-image", {
    borderRadius: "calc(var(--radius) * 0.6)",
    height: "2.5rem",
    overflow: "hidden",
    width: "2.5rem",
    "& img": {
      height: "100%",
      objectFit: "cover",
      width: "100%",
    },
  }),
};

const content = style("item-content", {
  display: "flex",
  flex: "1 1 0%",
  flexDirection: "column",
  gap: "0.25rem",
  "& + [data-slot='item-content']": {
    flex: "none",
  },
});

const title = style("item-title", {
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1.625",
  width: "fit-content",
});

const description = style("item-description", {
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
});

const actions = style("item-actions", {
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
});

const header = style("item-header", {
  alignItems: "center",
  display: "flex",
  flexBasis: "100%",
  gap: "0.5rem",
  justifyContent: "space-between",
});

const footer = style("item-footer", {
  alignItems: "center",
  display: "flex",
  flexBasis: "100%",
  gap: "0.5rem",
  justifyContent: "space-between",
});

css({
  "[data-slot='item']:has([data-slot='item-description']) [data-slot='item-media']": {
    alignSelf: "flex-start",
    transform: "translateY(0.125rem)",
  },
});

interface ItemGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemGroup(props: ItemGroupProps): HellaNode {
  return html`
    <div
      role="list"
      data-slot="item-group"
      class="${
        [group, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemSeparatorProps {
  class?: string;
}

export function ItemSeparator(props: ItemSeparatorProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="item-separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class="${
        [
          separatorBase,
          separator,
          props.class,
        ]
      }"
    ></div>
  ` as HellaNode;
}

interface ItemProps {
  children?: HellaChildren;
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  /** Static boolean or reactive fn; drives data-selected + aria-selected (omitted when absent). */
  selected?: boolean | (() => boolean);
  class?: string;
}

export function Item(props: ItemProps): HellaNode {
  const selectedAttr = (): "true" | "false" =>
    (typeof props.selected === "function" ? props.selected() : props.selected) ? "true" : "false";
  return html`
    <div
      data-slot="item"
      data-variant="${props.variant ?? "default"}"
      data-size="${props.size ?? "default"}"
      data-selected="${selectedAttr}"
      aria-selected="${selectedAttr}"
      class="${
        [
          base,
          variants[props.variant ?? "default"],
          sizes[props.size ?? "default"],
          props.class,
        ]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemMediaProps {
  children?: HellaChildren;
  variant?: "default" | "icon" | "image";
  class?: string;
}

export function ItemMedia(props: ItemMediaProps): HellaNode {
  return html`
    <div
      data-slot="item-media"
      data-variant="${props.variant ?? "default"}"
      class="${
        [
          media,
          mediaVariants[props.variant ?? "default"],
          props.class,
        ]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemContentProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemContent(props: ItemContentProps): HellaNode {
  return html`
    <div
      data-slot="item-content"
      class="${
        [content, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemTitleProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemTitle(props: ItemTitleProps): HellaNode {
  return html`
    <div
      data-slot="item-title"
      class="${
        [title, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemDescriptionProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemDescription(props: ItemDescriptionProps): HellaNode {
  return html`
    <p
      data-slot="item-description"
      class="${
        [description, props.class]
      }"
    >${() => props.children}</p>
  ` as HellaNode;
}

interface ItemActionsProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemActions(props: ItemActionsProps): HellaNode {
  return html`
    <div
      data-slot="item-actions"
      class="${
        [actions, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemHeaderProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemHeader(props: ItemHeaderProps): HellaNode {
  return html`
    <div
      data-slot="item-header"
      class="${
        [header, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemFooterProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemFooter(props: ItemFooterProps): HellaNode {
  return html`
    <div
      data-slot="item-footer"
      class="${
        [footer, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
