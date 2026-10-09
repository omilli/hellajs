import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const avatar: string;
declare const base: string;
declare const content: string;
declare const footer: string;
declare const group: string;
declare const header: string;
// @hella:end

interface MessageGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

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

interface MessageProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  align?: "start" | "end";
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

interface MessageAvatarProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
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

interface MessageContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageContent({ children, class: cls, ...attrs }: MessageContentProps): JSX.Element {
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

interface MessageHeaderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
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

interface MessageFooterProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
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
