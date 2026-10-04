import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style({
  borderRadius: "calc(infinity * 1px)",
  display: "flex",
  flexShrink: "0",
  height: "2rem",
  overflow: "hidden",
  position: "relative",
  userSelect: "none",
  width: "2rem",
  "&[data-size='lg']": {
    height: "2.5rem",
    width: "2.5rem",
  },
  "&[data-size='sm']": {
    height: "1.5rem",
    width: "1.5rem",
  },
}, { label: "avatar" });

const image = style({
  aspectRatio: "1 / 1",
  height: "100%",
  width: "100%",
}, { label: "avatar-image" });

const fallback = style({
  alignItems: "center",
  backgroundColor: "var(--muted)",
  borderRadius: "calc(infinity * 1px)",
  color: "var(--muted-foreground)",
  display: "flex",
  fontSize: "0.875rem",
  height: "100%",
  justifyContent: "center",
  width: "100%",
  "&:is([data-slot='avatar'][data-size='sm'] *)": {
    fontSize: "0.75rem",
  },
}, { label: "avatar-fallback" });

const badge = style({
  alignItems: "center",
  backgroundColor: "var(--primary)",
  borderRadius: "calc(infinity * 1px)",
  bottom: "0",
  boxShadow: "0 0 0 2px var(--background)",
  color: "var(--primary-foreground)",
  display: "inline-flex",
  justifyContent: "center",
  position: "absolute",
  right: "0",
  userSelect: "none",
  zIndex: "10",
  "&:is([data-slot='avatar'][data-size='sm'] *)": {
    height: "0.5rem",
    width: "0.5rem",
    "& > svg": {
      display: "none",
    },
  },
  "&:is([data-slot='avatar'][data-size='default'] *)": {
    height: "0.625rem",
    width: "0.625rem",
    "& > svg": {
      height: "0.5rem",
      width: "0.5rem",
    },
  },
  "&:is([data-slot='avatar'][data-size='lg'] *)": {
    height: "0.75rem",
    width: "0.75rem",
    "& > svg": {
      height: "0.5rem",
      width: "0.5rem",
    },
  },
}, { label: "avatar-badge" });

const group = style({
  display: "flex",
  "& > :not(:last-child)": {
    marginInlineEnd: "-0.5rem",
  },
  "& > [data-slot='avatar']": {
    boxShadow: "0 0 0 2px var(--background)",
  },
}, { label: "avatar-group" });

const groupCount = style({
  alignItems: "center",
  backgroundColor: "var(--muted)",
  borderRadius: "calc(infinity * 1px)",
  boxShadow: "0 0 0 2px var(--background)",
  color: "var(--muted-foreground)",
  display: "flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  height: "2rem",
  justifyContent: "center",
  position: "relative",
  width: "2rem",
  "& > svg": {
    height: "1rem",
    width: "1rem",
  },
  "&:is([data-slot='avatar-group']:has([data-size='lg']) *)": {
    height: "2.5rem",
    width: "2.5rem",
    "& > svg": {
      height: "1.25rem",
      width: "1.25rem",
    },
  },
  "&:is([data-slot='avatar-group']:has([data-size='sm']) *)": {
    height: "1.5rem",
    width: "1.5rem",
    "& > svg": {
      height: "0.75rem",
      width: "0.75rem",
    },
  },
}, { label: "avatar-group-count" });

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
        [base, props.class]
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
        [image, props.class]
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
        [fallback, props.class]
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
        [badge, props.class]
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

export function AvatarGroup(props: AvatarBadgeProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group"
      class="${
        [group, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AvatarGroupCount(props: AvatarBadgeProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group-count"
      class="${
        [groupCount, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
