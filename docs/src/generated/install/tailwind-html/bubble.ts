import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const bubble =
  "group/bubble relative flex w-fit max-w-[80%] min-w-0 flex-col gap-1 group-data-[align=end]/message:self-end data-[align=end]:self-end data-[variant=ghost]:max-w-full";

const variants = {
  default:
    "*:data-[slot=bubble-content]:bg-primary *:data-[slot=bubble-content]:text-primary-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-primary/80",
  secondary:
    "*:data-[slot=bubble-content]:bg-secondary *:data-[slot=bubble-content]:text-secondary-foreground [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
  muted:
    "*:data-[slot=bubble-content]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[color-mix(in_oklch,var(--muted),var(--foreground)_5%)]",
  tinted:
    "*:data-[slot=bubble-content]:bg-[oklch(from_var(--primary)_0.93_calc(c*0.4)_h)] *:data-[slot=bubble-content]:text-foreground dark:*:data-[slot=bubble-content]:bg-[oklch(from_var(--primary)_0.3_calc(c*0.4)_h)] [&>[data-slot=bubble-content]:is(button,a):hover]:bg-[oklch(from_var(--primary)_0.88_calc(c*0.5)_h)] dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-[oklch(from_var(--primary)_0.35_calc(c*0.5)_h)]",
  outline:
    "*:data-[slot=bubble-content]:border-border *:data-[slot=bubble-content]:bg-background [&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:text-foreground dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-input/30",
  ghost:
    "border-none *:data-[slot=bubble-content]:rounded-none *:data-[slot=bubble-content]:bg-transparent *:data-[slot=bubble-content]:p-0 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted [&>[data-slot=bubble-content]:is(button,a):hover]:text-foreground dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-muted/50",
  destructive:
    "*:data-[slot=bubble-content]:bg-destructive/10 *:data-[slot=bubble-content]:text-destructive dark:*:data-[slot=bubble-content]:bg-destructive/20 [&>[data-slot=bubble-content]:is(button,a):hover]:bg-destructive/20 dark:[&>[data-slot=bubble-content]:is(button,a):hover]:bg-destructive/30",
};

const content =
  "w-fit max-w-full min-w-0 overflow-hidden rounded-xl border border-transparent px-3 py-2 text-sm leading-relaxed wrap-break-word group-data-[align=end]/bubble:self-end [button]:text-left [button,a]:transition-colors [button,a]:outline-none [button,a]:focus-visible:border-ring [button,a]:focus-visible:ring-3 [button,a]:focus-visible:ring-ring/50";

const reactions =
  "absolute z-10 flex w-fit shrink-0 items-center justify-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-sm ring-3 ring-card has-[button]:p-0";

const reactionsSides = {
  top: "top-0 -translate-y-3/4",
  bottom: "bottom-0 translate-y-3/4",
};

const reactionsAligns = {
  start: "left-3",
  end: "right-3",
};

interface BubbleGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function BubbleGroup(props: BubbleGroupProps): HellaNode {
  return html`
    <div
      data-slot="bubble-group"
      class="${
        cn("flex min-w-0 flex-col gap-2", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface BubbleProps {
  children?: HellaChildren;
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  align?: "start" | "end";
  class?: string;
}

export function Bubble(props: BubbleProps): HellaNode {
  return html`
    <div
      data-slot="bubble"
      data-variant="${props.variant ?? "default"}"
      data-align="${props.align ?? "start"}"
      class="${
        cn(bubble, variants[props.variant ?? "default"], props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface BubbleContentProps {
  children?: HellaChildren;
  class?: string;
}

export function BubbleContent(props: BubbleContentProps): HellaNode {
  return html`
    <div
      data-slot="bubble-content"
      class="${
        cn(content, props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface BubbleReactionsProps {
  children?: HellaChildren;
  side?: "top" | "bottom";
  align?: "start" | "end";
  class?: string;
}

export function BubbleReactions(props: BubbleReactionsProps): HellaNode {
  return html`
    <div
      data-slot="bubble-reactions"
      data-align="${props.align ?? "end"}"
      data-side="${props.side ?? "bottom"}"
      class="${
        cn(reactions, reactionsSides[props.side ?? "bottom"], reactionsAligns[props.align ?? "end"], props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
