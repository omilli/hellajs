import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

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

export function MessageGroup({ children, class: cls, ...attrs }: MessageGroupProps): HellaNode {
  return html`
    <div
      data-slot="message-group"
      class="${
        // @hella:compose
        [group, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface MessageProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  align?: "start" | "end";
}

export function Message({ align, children, class: cls, ...attrs }: MessageProps): HellaNode {
  return html`
    <div
      data-slot="message"
      data-align="${align ?? "start"}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface MessageAvatarProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageAvatar({ children, class: cls, ...attrs }: MessageAvatarProps): HellaNode {
  return html`
    <div
      data-slot="message-avatar"
      class="${
        // @hella:compose
        [avatar, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface MessageContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageContent({ children, class: cls, ...attrs }: MessageContentProps): HellaNode {
  return html`
    <div
      data-slot="message-content"
      class="${
        // @hella:compose
        [content, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface MessageHeaderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageHeader({ children, class: cls, ...attrs }: MessageHeaderProps): HellaNode {
  return html`
    <div
      data-slot="message-header"
      class="${
        // @hella:compose
        [header, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface MessageFooterProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function MessageFooter({ children, class: cls, ...attrs }: MessageFooterProps): HellaNode {
  return html`
    <div
      data-slot="message-footer"
      class="${
        // @hella:compose
        [footer, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
