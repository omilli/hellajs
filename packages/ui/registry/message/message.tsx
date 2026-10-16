import type {
  MessageGroupProps,
  MessageProps,
  MessageAvatarProps,
  MessageContentProps,
  MessageHeaderProps,
  MessageFooterProps,
} from "./message-types.js";

// @hella:styles
declare const avatar: string;
declare const base: string;
declare const content: string;
declare const footer: string;
declare const group: string;
declare const header: string;
// @hella:end

export function MessageGroup({ children, class: cls, ...attrs }: MessageGroupProps): JSX.Element {
  return (
    <div
      data-slot="message-group"
      class={
        // @hella:compose
        [group, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function Message({ align, children, class: cls, ...attrs }: MessageProps): JSX.Element {
  return (
    <div
      data-slot="message"
      data-align={align ?? "start"}
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

export function MessageAvatar({ children, class: cls, ...attrs }: MessageAvatarProps): JSX.Element {
  return (
    <div
      data-slot="message-avatar"
      class={
        // @hella:compose
        [avatar, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function MessageContent({
  children,
  class: cls,
  ...attrs
}: MessageContentProps): JSX.Element {
  return (
    <div
      data-slot="message-content"
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

export function MessageHeader({ children, class: cls, ...attrs }: MessageHeaderProps): JSX.Element {
  return (
    <div
      data-slot="message-header"
      class={
        // @hella:compose
        [header, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function MessageFooter({ children, class: cls, ...attrs }: MessageFooterProps): JSX.Element {
  return (
    <div
      data-slot="message-footer"
      class={
        // @hella:compose
        [footer, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}
