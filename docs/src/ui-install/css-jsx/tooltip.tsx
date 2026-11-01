import { tooltip } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface TooltipProps extends HTMLAttributes<"span"> {
  content: HellaChildren;
  /** Pointer-hover ms before the content opens. Default 700. */
  delayDuration?: number;
  /** Controlled open-state getter; passing it makes the tooltip controlled, omitting it keeps state internal. */
  open?: () => boolean;
  /** Called on every open-state change, owned hover and dismissal alike. */
  onOpenChange?: (open: boolean) => void;
  side?: AnchorSide;
  align?: AnchorAlign;
  children?: HellaChildren;
  class?: string;
}

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({
  from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" },
});
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const content = style("tooltip-content", {
  backgroundColor: tokens.foreground,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: tokens.background,
  fontSize: "0.75rem",
  lineHeight: "1rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.75rem",
  textWrap: "balance",
  transformOrigin: "var(--radix-tooltip-content-transform-origin)",
  width: "fit-content",
  zIndex: "50",
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
});

export function Tooltip({
  content: contentSlot,
  delayDuration,
  open,
  onOpenChange,
  side,
  align,
  children,
  class: cls,
  ...attrs
}: TooltipProps): JSX.Element {
  const { Trigger, Content } = tooltip({ delay: delayDuration, open, onOpenChange });
  return (
    <Trigger
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
      <Content
        side={side}
        align={align}
        class={
          [content]
        }
      >
        {contentSlot}
      </Content>
    </Trigger>
  );
}
