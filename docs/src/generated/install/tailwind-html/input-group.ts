import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const addonAlign = {
  "inline-start": "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
  "inline-end": "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
  "block-start": "order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3",
  "block-end": "order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3",
};

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
};

const buttonSizes = {
  xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
  "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-8",
};

const sizes = {
  xs: "flex items-center gap-2 text-sm shadow-none h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
  sm: "flex items-center gap-2 text-sm shadow-none h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
  "icon-xs": "flex items-center gap-2 text-sm shadow-none size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
  "icon-sm": "flex items-center gap-2 text-sm shadow-none size-8 p-0 has-[>svg]:p-0",
};

interface InputGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Renders data-disabled="true" on the group; addons read it for their opacity state. */
  disabled?: boolean;
  class?: string;
}

export default function InputGroup({ disabled, children, class: cls, ...attrs }: InputGroupProps): HellaNode {
  return html`
    <div
      data-slot="input-group"
      role="group"
      data-disabled="${disabled ? "true" : undefined}"
      class="${
        cn("group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30 h-9 min-w-0 has-[>textarea]:h-auto has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface InputGroupAddonProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  align?: "inline-start" | "inline-end" | "block-start" | "block-end";
  class?: string;
}

export function InputGroupAddon({ align, children, class: cls, ...attrs }: InputGroupAddonProps): HellaNode {
  return html`
    <div
      role="group"
      data-slot="input-group-addon"
      data-align="${align ?? "inline-start"}"
      class="${
        cn(
          "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4",
          addonAlign[align ?? "inline-start"],
          cls,
        )
      }"
      e:click="${(e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest("button")) return;
        target.closest('[data-slot="input-group"]')?.querySelector("input")?.focus();
      }}"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface InputGroupButtonProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "xs" | "sm" | "icon-xs" | "icon-sm";
  class?: string;
}

export function InputGroupButton({ variant, size, children, class: cls, ...attrs }: InputGroupButtonProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="button"
      data-variant="${variant ?? "ghost"}"
      data-size="${size ?? "xs"}"
      class="${
        cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          buttonVariants[variant ?? "ghost"],
          buttonSizes[size ?? "xs"],
          sizes[size ?? "xs"],
          cls,
        )
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface InputGroupTextProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export function InputGroupText({ children, class: cls, ...attrs }: InputGroupTextProps): HellaNode {
  return html`
    <span
      data-slot="input-group-text"
      class="${
        cn("flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4", cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface InputGroupInputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export function InputGroupInput({ class: cls, ...attrs }: InputGroupInputProps): HellaNode {
  return html`
    <input
      data-slot="input-group-control"
      class="${
        cn(
          "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          "flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent",
          cls,
        )
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

interface InputGroupTextareaProps extends HTMLAttributes<"textarea"> {
  class?: string;
}

export function InputGroupTextarea({ class: cls, ...attrs }: InputGroupTextareaProps): HellaNode {
  return html`
    <textarea
      data-slot="input-group-control"
      class="${
        cn(
          "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          "flex-1 resize-none rounded-none border-0 bg-transparent py-3 shadow-none focus-visible:ring-0 dark:bg-transparent",
          cls,
        )
      }"
      ...${attrs}
    ></textarea>
  ` as HellaNode;
}
