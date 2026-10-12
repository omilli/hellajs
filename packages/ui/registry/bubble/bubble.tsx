import type { BubbleGroupProps, BubbleProps, BubbleContentProps, BubbleReactionsProps } from "./bubble-types.js";

// @hella:styles
declare const base: string;
declare const bubble: string;
declare const content: string;
declare const reactions: string;
declare const reactionsAligns: Record<string, string>;
declare const reactionsSides: Record<string, string>;
declare const variants: Record<string, string>;
// @hella:end

export function BubbleGroup({ children, class: cls, ...attrs }: BubbleGroupProps): JSX.Element {
  return (
    <div
      data-slot="bubble-group"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function Bubble({ variant, align, children, class: cls, ...attrs }: BubbleProps): JSX.Element {
  return (
    <div
      data-slot="bubble"
      data-variant={variant ?? "default"}
      data-align={align ?? "start"}
      class={
        // @hella:compose
        [bubble, variants[variant ?? "default"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function BubbleContent({ children, class: cls, ...attrs }: BubbleContentProps): JSX.Element {
  return (
    <div
      data-slot="bubble-content"
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function BubbleReactions({ side, align, children, class: cls, ...attrs }: BubbleReactionsProps): JSX.Element {
  return (
    <div
      data-slot="bubble-reactions"
      data-align={align ?? "end"}
      data-side={side ?? "bottom"}
      class={
        // @hella:compose
        [reactions, reactionsSides[side ?? "bottom"], reactionsAligns[align ?? "end"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
