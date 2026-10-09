import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const group = style("item-group", {
  display: "flex",
  flexDirection: "column",
});

const separatorBase = style("item-separator", {
  backgroundColor: tokens.border,
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
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
});

const variants = {
  default: style("item-default", {
    backgroundColor: "transparent",
  }),
  outline: style("item-outline", {
    borderColor: tokens.border,
  }),
  muted: style("item-muted", {
    backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
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
    backgroundColor: tokens.muted,
    border: `1px solid ${tokens.border}`,
    borderRadius: `calc(${tokens.radius} * 0.6)`,
    height: "2rem",
    width: "2rem",
    "& svg:not([class*='size-'])": {
      height: "1rem",
      width: "1rem",
    },
  }),
  image: style("item-media-image", {
    borderRadius: `calc(${tokens.radius} * 0.6)`,
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
  color: tokens.mutedForeground,
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
    color: tokens.primary,
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

interface ItemGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemGroup({ children, class: cls, ...attrs }: ItemGroupProps): HellaNode {
  return html`
    <div
      role="list"
      data-slot="item-group"
      class="${
        [group, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ItemSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

export function ItemSeparator({ class: cls, ...attrs }: ItemSeparatorProps): HellaNode {
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
          cls,
        ]
      }"
      ...${attrs}
    ></div>
  ` as HellaNode;
}

interface ItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  /** Static boolean or reactive fn; drives data-selected + aria-selected (omitted when absent). */
  selected?: boolean | (() => boolean);
}

export function Item({ variant, size, selected, children, class: cls, ...attrs }: ItemProps): HellaNode {
  const selectedAttr = (): "true" | "false" =>
    (typeof selected === "function" ? selected() : selected) ? "true" : "false";
  return html`
    <div
      data-slot="item"
      data-variant="${variant ?? "default"}"
      data-size="${size ?? "default"}"
      data-selected="${selectedAttr}"
      aria-selected="${selectedAttr}"
      class="${
        [
          base,
          variants[variant ?? "default"],
          sizes[size ?? "default"],
          cls,
        ]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ItemMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "icon" | "image";
}

export function ItemMedia({ variant, children, class: cls, ...attrs }: ItemMediaProps): HellaNode {
  return html`
    <div
      data-slot="item-media"
      data-variant="${variant ?? "default"}"
      class="${
        [
          media,
          mediaVariants[variant ?? "default"],
          cls,
        ]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ItemContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemContent({ children, class: cls, ...attrs }: ItemContentProps): HellaNode {
  return html`
    <div
      data-slot="item-content"
      class="${
        [content, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ItemTitleProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemTitle({ children, class: cls, ...attrs }: ItemTitleProps): HellaNode {
  return html`
    <div
      data-slot="item-title"
      class="${
        [title, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ItemDescriptionProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemDescription({ children, class: cls, ...attrs }: ItemDescriptionProps): HellaNode {
  return html`
    <p
      data-slot="item-description"
      class="${
        [description, cls]
      }"
      ...${attrs}
    >${() => children}</p>
  ` as HellaNode;
}

interface ItemActionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemActions({ children, class: cls, ...attrs }: ItemActionsProps): HellaNode {
  return html`
    <div
      data-slot="item-actions"
      class="${
        [actions, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ItemHeaderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemHeader({ children, class: cls, ...attrs }: ItemHeaderProps): HellaNode {
  return html`
    <div
      data-slot="item-header"
      class="${
        [header, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface ItemFooterProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemFooter({ children, class: cls, ...attrs }: ItemFooterProps): HellaNode {
  return html`
    <div
      data-slot="item-footer"
      class="${
        [footer, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
