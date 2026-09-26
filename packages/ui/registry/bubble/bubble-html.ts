import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const bubble: string;
declare const content: string;
declare const reactions: string;
declare const reactionsAligns: Record<string, string>;
declare const reactionsSides: Record<string, string>;
declare const variants: Record<string, string>;
// @hella:end

interface BubbleGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function BubbleGroup(props: BubbleGroupProps): HellaNode {
  return html`
    <div
      data-slot="bubble-group"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
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
        // @hella:compose
        [bubble, variants[props.variant ?? "default"], props.class]
        // @hella:end
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
        // @hella:compose
        [content, props.class]
        // @hella:end
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
        // @hella:compose
        [reactions, reactionsSides[props.side ?? "bottom"], reactionsAligns[props.align ?? "end"], props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
