import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const base =
  "group/attachment relative flex w-fit max-w-full min-w-0 shrink-0 flex-wrap rounded-xl border bg-card text-card-foreground transition-colors focus-within:ring-1 focus-within:ring-ring/50 has-[>a,>button]:hover:bg-muted/50 data-[state=error]:border-destructive/30 data-[state=idle]:border-dashed";

const sizes = {
  default:
    "gap-2 text-sm has-data-[slot=attachment-content]:px-2.5 has-data-[slot=attachment-content]:py-2 has-data-[slot=attachment-media]:p-2",
  sm: "gap-2.5 text-xs has-data-[slot=attachment-content]:px-2 has-data-[slot=attachment-content]:py-1.5 has-data-[slot=attachment-media]:p-1.5",
  xs: "gap-1.5 rounded-lg text-xs has-data-[slot=attachment-content]:px-1.5 has-data-[slot=attachment-content]:py-1 has-data-[slot=attachment-media]:p-1",
};

const orientations = {
  horizontal: "min-w-40 items-center",
  vertical: "w-24 flex-col has-data-[slot=attachment-content]:w-30",
};

const media =
  "relative flex aspect-square w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted text-foreground group-data-[orientation=vertical]/attachment:w-full group-data-[size=sm]/attachment:w-8 group-data-[size=xs]/attachment:w-7 group-data-[size=xs]/attachment:rounded-md group-data-[state=error]/attachment:bg-destructive/10 group-data-[state=error]/attachment:text-destructive group-data-[orientation=vertical]/attachment:*:data-[slot=spinner]:size-6! [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 group-data-[orientation=vertical]/attachment:[&_svg:not([class*='size-'])]:size-6 group-data-[size=xs]/attachment:[&_svg:not([class*='size-'])]:size-3.5";

const mediaVariants: Record<string, string> = {
  image:
    "opacity-60 group-data-[state=done]/attachment:opacity-100 group-data-[state=idle]/attachment:opacity-100 *:[img]:aspect-square *:[img]:w-full *:[img]:object-cover",
};

const content =
  "max-w-full min-w-0 flex-1 leading-tight group-data-[orientation=vertical]/attachment:px-1";

const title =
  "block max-w-full min-w-0 truncate font-medium group-data-[state=processing]/attachment:shimmer group-data-[state=uploading]/attachment:shimmer";

const description =
  "mt-0.5 block min-w-0 truncate text-xs text-muted-foreground group-data-[state=error]/attachment:text-destructive/80 max-w-full";

const actions =
  "relative z-20 flex shrink-0 items-center group-data-[orientation=vertical]/attachment:absolute group-data-[orientation=vertical]/attachment:top-3 group-data-[orientation=vertical]/attachment:right-3 group-data-[orientation=vertical]/attachment:gap-1";

const group =
  "flex min-w-0 scroll-fade-x snap-x snap-mandatory scroll-px-1 scrollbar-none gap-3 overflow-x-auto overscroll-x-contain py-1 *:data-[slot=attachment]:flex-none *:data-[slot=attachment]:snap-start";

const buttonBase =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
  outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
  link: "text-primary underline-offset-4 hover:underline",
};

const buttonSizes = {
  default: "h-9 px-4 py-2 has-[>svg]:px-3",
  xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
  sm: "h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5",
  lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
  icon: "size-9",
  "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
  "icon-sm": "size-8",
  "icon-lg": "size-10",
};

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

interface AttachmentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  state?: AttachmentState;
  size?: "default" | "sm" | "xs";
  orientation?: "horizontal" | "vertical";
}

export function Attachment({ state, size, orientation, children, class: cls, ...attrs }: AttachmentProps): HellaNode {
  return html`
    <div
      data-slot="attachment"
      data-state="${state ?? "done"}"
      data-size="${size ?? "default"}"
      data-orientation="${orientation ?? "horizontal"}"
      class="${
        cn(base, sizes[size ?? "default"], orientations[orientation ?? "horizontal"], cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AttachmentMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "icon" | "image";
  /** The owning Attachment's state; inlines the loading spinner on uploading and the error glyph on error when no children are authored. */
  state?: AttachmentState;
}

const loaderIcon = (): HellaNode => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>` as HellaNode;

const errorIcon = (): HellaNode => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m15 9-6 6" />
    <path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" />
    <path d="m9 9 6 6" />
  </svg>` as HellaNode;

export function AttachmentMedia({ variant, state, children, class: cls, ...attrs }: AttachmentMediaProps): HellaNode {
  const autoIcon = (): HellaChildren | undefined => {
    if (children !== undefined) return undefined;
    if (state === "uploading") return loaderIcon();
    if (state === "error") return errorIcon();
    return undefined;
  };

  return html`
    <div
      data-slot="attachment-media"
      data-variant="${variant ?? "icon"}"
      class="${
        cn(media, mediaVariants[variant ?? "icon"], cls)
      }"
      ...${attrs}
    >${() => children ?? autoIcon()}</div>
  ` as HellaNode;
}

interface AttachmentContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentContent({ children, class: cls, ...attrs }: AttachmentContentProps): HellaNode {
  return html`
    <div
      data-slot="attachment-content"
      class="${
        cn(content, cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AttachmentTitleProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentTitle({ children, class: cls, ...attrs }: AttachmentTitleProps): HellaNode {
  return html`
    <span
      data-slot="attachment-title"
      class="${
        cn(title, cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface AttachmentDescriptionProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentDescription({ children, class: cls, ...attrs }: AttachmentDescriptionProps): HellaNode {
  return html`
    <span
      data-slot="attachment-description"
      class="${
        cn(description, cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface AttachmentActionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentActions({ children, class: cls, ...attrs }: AttachmentActionsProps): HellaNode {
  return html`
    <div
      data-slot="attachment-actions"
      class="${
        cn(actions, cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AttachmentActionProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export function AttachmentAction({ variant, size, children, class: cls, ...attrs }: AttachmentActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="attachment-action"
      data-variant="${variant ?? "ghost"}"
      data-size="${size ?? "icon-xs"}"
      class="${
        cn(buttonBase, buttonVariants[variant ?? "ghost"], buttonSizes[size ?? "icon-xs"], cls)
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface AttachmentTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentTrigger({ children, class: cls, ...attrs }: AttachmentTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="attachment-trigger"
      class="${
        cn("absolute inset-0 z-10 outline-none", cls)
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface AttachmentGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentGroup({ children, class: cls, ...attrs }: AttachmentGroupProps): HellaNode {
  return html`
    <div
      data-slot="attachment-group"
      class="${
        cn(group, cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
