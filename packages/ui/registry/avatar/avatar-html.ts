import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface AvatarProps {
  children?: HellaChildren;
  size?: "default" | "sm" | "lg";
  class?: string;
}

export default function Avatar(props: AvatarProps): HellaNode {
  return html`
    <div
      data-slot="avatar"
      data-size="${props.size ?? "default"}"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AvatarImageProps {
  src?: string;
  alt?: string;
  /** Shared loaded state: flipped by load/error, read by AvatarFallback to swap visibility. */
  loaded?: Signal<boolean>;
  class?: string;
}

export function AvatarImage(props: AvatarImageProps): HellaNode {
  const loaded = props.loaded ?? signal(false);
  return html`
    <img
      data-slot="avatar-image"
      src="${props.src}"
      alt="${props.alt}"
      hidden="${() => !loaded()}"
      class="${
        // @hella:compose
        [image, props.class]
        // @hella:end
      }"
      e:load="${() => loaded(true)}"
      e:error="${() => loaded(false)}"
    />
  ` as HellaNode;
}

interface AvatarFallbackProps {
  children?: HellaChildren;
  /** Shared loaded state: the fallback hides while the signal reads true. */
  loaded?: () => boolean;
  class?: string;
}

export function AvatarFallback(props: AvatarFallbackProps): HellaNode {
  return html`
    <span
      data-slot="avatar-fallback"
      hidden="${() => Boolean(props.loaded?.())}"
      class="${
        // @hella:compose
        [fallback, props.class]
        // @hella:end
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

interface AvatarBadgeProps {
  children?: HellaChildren;
  class?: string;
}

export function AvatarBadge(props: AvatarBadgeProps): HellaNode {
  return html`
    <span
      data-slot="avatar-badge"
      class="${
        // @hella:compose
        [badge, props.class]
        // @hella:end
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

export function AvatarGroup(props: AvatarBadgeProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group"
      class="${
        // @hella:compose
        [group, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AvatarGroupCount(props: AvatarBadgeProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group-count"
      class="${
        // @hella:compose
        [groupCount, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
