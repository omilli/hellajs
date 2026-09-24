import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface BubbleGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function BubbleGroup(props: BubbleGroupProps): JSX.Element {
  return (
    <div
      data-slot="bubble-group"
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface BubbleProps {
  children?: HellaChildren;
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  align?: "start" | "end";
  class?: string;
}

export function Bubble(props: BubbleProps): JSX.Element {
  return (
    <div
      data-slot="bubble"
      data-variant={props.variant ?? "default"}
      data-align={props.align ?? "start"}
      class={
        // @hella:compose
        [bubble, variants[props.variant ?? "default"], props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface BubbleContentProps {
  children?: HellaChildren;
  class?: string;
}

export function BubbleContent(props: BubbleContentProps): JSX.Element {
  return (
    <div
      data-slot="bubble-content"
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

interface BubbleReactionsProps {
  children?: HellaChildren;
  side?: "top" | "bottom";
  align?: "start" | "end";
  class?: string;
}

export function BubbleReactions(props: BubbleReactionsProps): JSX.Element {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={props.align ?? "end"}
      data-side={props.side ?? "bottom"}
      class={
        // @hella:compose
        [reactions, reactionsSides[props.side ?? "bottom"], reactionsAligns[props.align ?? "end"], props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}
