import { tooltip } from "@hellajs/headless";
import type {
  TooltipProviderProps,
  TooltipTriggerProps,
  TooltipContentProps,
  TooltipProps,
} from "./tooltip-types.js";

// @hella:styles
declare const content: string;
// @hella:end

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
        // @hella:compose
        [cls]
        // @hella:end
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
        // @hella:compose
        [cls]
        // @hella:end
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
        // @hella:compose
        [content, cls]
        // @hella:end
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
        // @hella:compose
        [cls]
        // @hella:end
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
