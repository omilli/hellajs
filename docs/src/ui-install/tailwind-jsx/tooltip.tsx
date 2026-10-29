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
import { cn } from "./cn.js";

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
        cn(cls)
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
        cn(cls)
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
        cn("z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", cls)
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
        cn(cls)
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
