import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface MessageGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageGroup(props: MessageGroupProps): HellaNode {
  return html`
    <div
      data-slot="message-group"
      class="${
        // @hella:compose
        [group, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageProps {
  children?: HellaChildren;
  align?: "start" | "end";
  class?: string;
}

export function Message(props: MessageProps): HellaNode {
  return html`
    <div
      data-slot="message"
      data-align="${props.align ?? "start"}"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageAvatarProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageAvatar(props: MessageAvatarProps): HellaNode {
  return html`
    <div
      data-slot="message-avatar"
      class="${
        // @hella:compose
        [avatar, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageContent(props: MessageContentProps): HellaNode {
  return html`
    <div
      data-slot="message-content"
      class="${
        // @hella:compose
        [content, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageHeaderProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageHeader(props: MessageHeaderProps): HellaNode {
  return html`
    <div
      data-slot="message-header"
      class="${
        // @hella:compose
        [header, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MessageFooterProps {
  children?: HellaChildren;
  class?: string;
}

export function MessageFooter(props: MessageFooterProps): HellaNode {
  return html`
    <div
      data-slot="message-footer"
      class="${
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
