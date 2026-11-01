import { messageScroller } from "@hellajs/headless";
import type { MessageScrollerItemProps, MessageScrollerProps } from "./message-scroller-types.js";
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
