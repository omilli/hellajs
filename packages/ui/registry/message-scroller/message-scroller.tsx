import { messageScroller } from "@hellajs/headless";
import type {
  MessageScrollerButtonProps,
  MessageScrollerContentProps,
  MessageScrollerItemProps,
  MessageScrollerProps,
  MessageScrollerProviderProps,
  MessageScrollerViewportProps,
} from "./message-scroller-types.js";
// @hella:styles
declare const base: string;
declare const buttonBase: string;
declare const buttonSizes: Record<string, string>;
declare const buttonVariants: Record<string, string>;
declare const content: string;
declare const item: string;
declare const overlay: string;
declare const viewport: string;
// @hella:end

/**
 * Drop-in composition wrapper kept for API parity with the upstream provider.
 * Hella has no context: state lives on signals the composer owns and passes to
 * the viewport and button explicitly (see MessageScrollerViewport).
 */
export function MessageScrollerProvider(props: MessageScrollerProviderProps): JSX.Element {
  return <>{props.children}</>;
}

export function MessageScrollerViewport({
  atBottom,
  scrollToBottom,
  threshold,
  observe,
  children,
  class: cls,
  ...attrs
}: MessageScrollerViewportProps): JSX.Element {
  const { Viewport } = messageScroller({ atBottom, scrollToBottom, threshold, observe });
  return (
    <Viewport
      class={
        // @hella:compose
        [viewport, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Viewport>
  );
}

export function MessageScrollerContent({
  children,
  class: cls,
  ...attrs
}: MessageScrollerContentProps): JSX.Element {
  const { Content } = messageScroller();
  return (
    <Content
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

export function MessageScrollerItem({
  children,
  class: cls,
  ...attrs
}: MessageScrollerItemProps): JSX.Element {
  const { Item } = messageScroller();
  return (
    <Item
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function MessageScrollerButton({
  atBottom,
  scrollToBottom,
  direction: dir,
  variant,
  size,
  "on:click": userClick,
  children,
  class: cls,
  ...attrs
}: MessageScrollerButtonProps): JSX.Element {
  const { Button } = messageScroller({ atBottom, scrollToBottom });
  return (
    <Button
      direction={dir}
      variant={variant}
      size={size}
      on:click={userClick}
      class={
        // @hella:compose
        [
          buttonBase,
          buttonVariants[variant ?? "secondary"],
          buttonSizes[size ?? "icon-sm"],
          overlay,
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Button>
  );
}

/**
 * Composed root: owns the at-bottom signal (or adopts the caller's), wraps the
 * children in a viewport + content stack, and renders the jump-to-end button
 * whose visibility the at-bottom state drives.
 */
export function MessageScroller({
  atBottom,
  scrollToBottom,
  threshold,
  observe,
  showScrollButton,
  children,
  class: cls,
  ...attrs
}: MessageScrollerProps): JSX.Element {
  const { Root, Viewport, Content, Button } = messageScroller({
    atBottom,
    scrollToBottom,
    threshold,
    observe,
  });
  return (
    <Root
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <Viewport
        class={
          // @hella:compose
          [viewport]
          // @hella:end
        }
      >
        <Content
          class={
            // @hella:compose
            [content]
            // @hella:end
          }
        >
          {children}
        </Content>
      </Viewport>
      {showScrollButton !== false && (
        <Button
          class={
            // @hella:compose
            [buttonBase, buttonVariants.secondary, buttonSizes["icon-sm"], overlay]
            // @hella:end
          }
        />
      )}
    </Root>
  );
}
