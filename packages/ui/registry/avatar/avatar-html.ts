import { signal } from "@hellajs/core";
import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { AvatarProps, AvatarImageProps, AvatarFallbackProps, AvatarBadgeProps, AvatarGroupProps, AvatarGroupCountProps } from "./avatar-types.js";

// @hella:styles
declare const badge: string;
declare const base: string;
declare const fallback: string;
declare const group: string;
declare const groupCount: string;
declare const image: string;
// @hella:end

export function Avatar({ size, children, class: cls, ...attrs }: AvatarProps): HellaNode {
  return html`
    <div
      data-slot="avatar"
      data-size="${size ?? "default"}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function AvatarImage({ loaded: loadedSignal, class: cls, ...attrs }: AvatarImageProps): HellaNode {
  const loaded = loadedSignal ?? signal(false);
  return html`
    <img
      data-slot="avatar-image"
      hidden="${() => !loaded()}"
      class="${
        // @hella:compose
        [image, cls]
        // @hella:end
      }"
      e:load="${() => loaded(true)}"
      e:error="${() => loaded(false)}"
      ...${attrs}
    />
  ` as HellaNode;
}

export function AvatarFallback({ loaded, children, class: cls, ...attrs }: AvatarFallbackProps): HellaNode {
  return html`
    <span
      data-slot="avatar-fallback"
      hidden="${() => Boolean(loaded?.())}"
      class="${
        // @hella:compose
        [fallback, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

export function AvatarBadge({ children, class: cls, ...attrs }: AvatarBadgeProps): HellaNode {
  return html`
    <span
      data-slot="avatar-badge"
      class="${
        // @hella:compose
        [badge, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

export function AvatarGroup({ children, class: cls, ...attrs }: AvatarGroupProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group"
      class="${
        // @hella:compose
        [group, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function AvatarGroupCount({ children, class: cls, ...attrs }: AvatarGroupCountProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group-count"
      class="${
        // @hella:compose
        [groupCount, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
