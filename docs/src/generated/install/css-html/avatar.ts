import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("avatar", {
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
});

const image = style("avatar-image", {
  aspectRatio: "1 / 1",
  height: "100%",
  width: "100%",
});

const fallback = style("avatar-fallback", {
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
});

const badge = style("avatar-badge", {
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
});

const group = style("avatar-group", {
  display: "flex",
  "& > :not(:last-child)": {
    marginInlineEnd: "-0.5rem",
  },
  "& > [data-slot='avatar']": {
    boxShadow: "0 0 0 2px var(--background)",
  },
});

const groupCount = style("avatar-group-count", {
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
});

interface AvatarProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  size?: "default" | "sm" | "lg";
}

export default function Avatar({ size, children, class: cls, ...attrs }: AvatarProps): HellaNode {
  return html`
    <div
      data-slot="avatar"
      data-size="${size ?? "default"}"
      class="${
        [base, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AvatarImageProps extends HTMLAttributes<"img"> {
  class?: string;
  /** Shared loaded state: flipped by load/error, read by AvatarFallback to swap visibility. */
  loaded?: Signal<boolean>;
}

export function AvatarImage({ loaded: loadedSignal, class: cls, ...attrs }: AvatarImageProps): HellaNode {
  const loaded = loadedSignal ?? signal(false);
  return html`
    <img
      data-slot="avatar-image"
      hidden="${() => !loaded()}"
      class="${
        [image, cls]
      }"
      e:load="${() => loaded(true)}"
      e:error="${() => loaded(false)}"
      ...${attrs}
    />
  ` as HellaNode;
}

interface AvatarFallbackProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
  /** Shared loaded state: the fallback hides while the signal reads true. */
  loaded?: () => boolean;
}

export function AvatarFallback({ loaded, children, class: cls, ...attrs }: AvatarFallbackProps): HellaNode {
  return html`
    <span
      data-slot="avatar-fallback"
      hidden="${() => Boolean(loaded?.())}"
      class="${
        [fallback, cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface AvatarBadgeProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarBadge({ children, class: cls, ...attrs }: AvatarBadgeProps): HellaNode {
  return html`
    <span
      data-slot="avatar-badge"
      class="${
        [badge, cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface AvatarGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarGroup({ children, class: cls, ...attrs }: AvatarGroupProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group"
      class="${
        [group, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AvatarGroupCountProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AvatarGroupCount({ children, class: cls, ...attrs }: AvatarGroupCountProps): HellaNode {
  return html`
    <div
      data-slot="avatar-group-count"
      class="${
        [groupCount, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
