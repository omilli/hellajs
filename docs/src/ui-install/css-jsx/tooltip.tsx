import { tooltip } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface TooltipProviderProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface TooltipTriggerProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface TooltipContentProps extends HTMLAttributes<"div"> {
  state?: () => "open" | "closed";
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Resolves the element the content anchors to; positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface TooltipProps extends HTMLAttributes<"span"> {
  content: HellaChildren;
  /** Pointer-hover ms before the content opens. Default 700. */
  delayDuration?: number;
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

/**
 * Passthrough wrapper - upstream config-carrier kept for copy-paste parity.
 * Divergence: delay config is the per-Tooltip `delayDuration` prop here, so
 * the provider carries children only.
 */
export function TooltipProvider({
  children,
  class: cls,
  ...attrs
}: TooltipProviderProps): JSX.Element {
  const { Provider } = tooltip();
  return (
    <Provider
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Provider>
  );
}

/** The manual trigger span; the composed Tooltip renders the same shape wired to the open delay. */
export function TooltipTrigger({
  children,
  class: cls,
  ...attrs
}: TooltipTriggerProps): JSX.Element {
  const { Trigger } = tooltip();
  return (
    <Trigger
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

export function TooltipContent({
  state,
  id,
  side,
  align,
  anchor,
  onExited,
  children,
  class: cls,
  ...attrs
}: TooltipContentProps): JSX.Element {
  const { Content } = tooltip({
    open: () => (state?.() ?? "open") === "open",
  });
  return (
    <Content
      id={id}
      side={side}
      align={align}
      anchor={anchor}
      onExited={onExited}
      class={
        [content, cls]
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

export function Tooltip({
  content: contentSlot,
  delayDuration,
  side,
  align,
  children,
  class: cls,
  ...attrs
}: TooltipProps): JSX.Element {
  const { Trigger, Content } = tooltip({ delay: delayDuration });
  return (
    <Trigger
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
      <Content side={side} align={align}>
        {contentSlot}
      </Content>
    </Trigger>
  );
}
