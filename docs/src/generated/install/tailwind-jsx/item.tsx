import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

const variants = {
  default: "bg-transparent",
  outline: "border-border",
  muted: "bg-muted/50",
};

const sizes = {
  default: "gap-4 p-4",
  sm: "gap-2.5 px-4 py-3",
};

const mediaVariants = {
  default: "bg-transparent",
  icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
  image: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
};

interface ItemGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemGroup({ children, class: cls, ...attrs }: ItemGroupProps): JSX.Element {
  return (
    <div
      role="list"
      data-slot="item-group"
      class={
        cn("group/item-group flex flex-col", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ItemSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

export function ItemSeparator({ class: cls, ...attrs }: ItemSeparatorProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="item-separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class={
        cn(
          "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
          "my-0",
          cls,
        )
      }
      {...attrs}
    />
  );
}

interface ItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  /** Static boolean or reactive fn; drives data-selected + aria-selected (omitted when absent). */
  selected?: boolean | (() => boolean);
}

export function Item({ variant, size, selected, children, class: cls, ...attrs }: ItemProps): JSX.Element {
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
        cn(
          "group/item flex flex-wrap items-center rounded-md border border-transparent text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-accent/50",
          variants[variant ?? "default"],
          sizes[size ?? "default"],
          cls,
        )
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ItemMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "icon" | "image";
}

export function ItemMedia({ variant, children, class: cls, ...attrs }: ItemMediaProps): JSX.Element {
  return (
    <div
      data-slot="item-media"
      data-variant={variant ?? "default"}
      class={
        cn(
          "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none",
          mediaVariants[variant ?? "default"],
          cls,
        )
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ItemContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemContent({ children, class: cls, ...attrs }: ItemContentProps): JSX.Element {
  return (
    <div
      data-slot="item-content"
      class={
        cn("flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ItemTitleProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemTitle({ children, class: cls, ...attrs }: ItemTitleProps): JSX.Element {
  return (
    <div
      data-slot="item-title"
      class={
        cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ItemDescriptionProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemDescription({ children, class: cls, ...attrs }: ItemDescriptionProps): JSX.Element {
  return (
    <p
      data-slot="item-description"
      class={
        cn("line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", cls)
      }
      {...attrs}
    >
      {children}
    </p>
  );
}

interface ItemActionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemActions({ children, class: cls, ...attrs }: ItemActionsProps): JSX.Element {
  return (
    <div
      data-slot="item-actions"
      class={
        cn("flex items-center gap-2", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ItemHeaderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemHeader({ children, class: cls, ...attrs }: ItemHeaderProps): JSX.Element {
  return (
    <div
      data-slot="item-header"
      class={
        cn("flex basis-full items-center justify-between gap-2", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ItemFooterProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ItemFooter({ children, class: cls, ...attrs }: ItemFooterProps): JSX.Element {
  return (
    <div
      data-slot="item-footer"
      class={
        cn("flex basis-full items-center justify-between gap-2", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
