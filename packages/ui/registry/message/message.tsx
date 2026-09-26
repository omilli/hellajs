import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const avatar: string;
declare const base: string;
declare const content: string;
declare const footer: string;
declare const group: string;
declare const header: string;
// @hella:end

interface MessageGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageGroup(props: MessageGroupProps): JSX.Element {
  return (
    <div
      data-slot="message-group"
      class={
        // @hella:compose
        [group, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface MessageProps {
  children?: HellaChildren;
  align?: "start" | "end";
  class?: string;
}

export function Message(props: MessageProps): JSX.Element {
  return (
    <div
      data-slot="message"
      data-align={props.align ?? "start"}
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

interface MessageAvatarProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageAvatar(props: MessageAvatarProps): JSX.Element {
  return (
    <div
      data-slot="message-avatar"
      class={
        // @hella:compose
        [avatar, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface MessageContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageContent(props: MessageContentProps): JSX.Element {
  return (
    <div
      data-slot="message-content"
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

interface MessageHeaderProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageHeader(props: MessageHeaderProps): JSX.Element {
  return (
    <div
      data-slot="message-header"
      class={
        // @hella:compose
        [header, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface MessageFooterProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageFooter(props: MessageFooterProps): JSX.Element {
  return (
    <div
      data-slot="message-footer"
      class={
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}
