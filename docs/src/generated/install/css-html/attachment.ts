import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("attachment", {
  position: "relative",
  display: "flex",
  width: "fit-content",
  maxWidth: "100%",
  minWidth: "0",
  flexShrink: "0",
  flexWrap: "wrap",
  borderRadius: `calc(${tokens.radius} * 1.4)`,
  border: `1px solid ${tokens.border}`,
  backgroundColor: tokens.card,
  color: tokens.cardForeground,
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&:focus-within": {
    boxShadow: `0 0 0 1px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:has(> a, > button):hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  },
  "&[data-state='error']": {
    borderColor: `color-mix(in oklab, ${tokens.destructive} 30%, transparent)`,
  },
  "&[data-state='idle']": {
    borderStyle: "dashed",
  },
});

const sizes = {
  default: style("attachment-size-default", {
    gap: "0.5rem",
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    "&:has([data-slot='attachment-content'])": {
      paddingInline: "0.625rem",
      paddingBlock: "0.5rem",
    },
    "&:has([data-slot='attachment-media'])": {
      padding: "0.5rem",
    },
  }),
  sm: style("attachment-size-sm", {
    gap: "0.625rem",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    "&:has([data-slot='attachment-content'])": {
      paddingInline: "0.5rem",
      paddingBlock: "0.375rem",
    },
    "&:has([data-slot='attachment-media'])": {
      padding: "0.375rem",
    },
  }),
  xs: style("attachment-size-xs", {
    borderRadius: `calc(${tokens.radius} * 1)`,
    gap: "0.375rem",
    fontSize: "0.75rem",
    lineHeight: "1rem",
    "&:has([data-slot='attachment-content'])": {
      paddingInline: "0.375rem",
      paddingBlock: "0.25rem",
    },
    "&:has([data-slot='attachment-media'])": {
      padding: "0.25rem",
    },
  }),
};

const orientations = {
  horizontal: style("attachment-horizontal", {
    minWidth: "10rem",
    alignItems: "center",
  }),
  vertical: style("attachment-vertical", {
    width: "6rem",
    flexDirection: "column",
    "&:has([data-slot='attachment-content'])": {
      width: "7.5rem",
    },
  }),
};

const media = style("attachment-media", {
  position: "relative",
  display: "flex",
  aspectRatio: "1 / 1",
  width: "2.5rem",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  borderRadius: `calc(${tokens.radius} * 1)`,
  backgroundColor: tokens.muted,
  color: tokens.foreground,
  "& svg": {
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
});

const mediaVariants = {
  icon: style("attachment-media-icon", {}),
  image: style("attachment-media-image", {
    opacity: "0.6",
    "& > img": {
      aspectRatio: "1 / 1",
      width: "100%",
      objectFit: "cover",
    },
  }),
};

const content = style("attachment-content", {
  maxWidth: "100%",
  minWidth: "0",
  flex: "1",
  lineHeight: "1.25",
});

const title = style("attachment-title", {
  display: "block",
  maxWidth: "100%",
  minWidth: "0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: "500",
});

const description = style("attachment-description", {
  marginTop: "0.125rem",
  display: "block",
  minWidth: "0",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.75rem",
  lineHeight: "1rem",
  color: tokens.mutedForeground,
});

const actions = style("attachment-actions", {
  position: "relative",
  zIndex: "20",
  display: "flex",
  flexShrink: "0",
  alignItems: "center",
});

const trigger = style("attachment-trigger", {
  position: "absolute",
  inset: "0",
  zIndex: "10",
  outlineStyle: "none",
});

const group = style("attachment-group", {
  display: "flex",
  minWidth: "0",
  gap: "0.75rem",
  overflowX: "auto",
  overscrollBehaviorX: "contain",
  scrollSnapType: "x mandatory",
  scrollPaddingInline: "0.25rem",
  paddingBlock: "0.25rem",
  "& > [data-slot='attachment']": {
    flex: "none",
    scrollSnapAlign: "start",
  },
});

const buttonBase = style("attachment-action", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

const buttonVariants = {
  default: style("attachment-action-default", {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.primary} 90%, transparent)`,
    },
  }),
  destructive: style("attachment-action-destructive", {
    backgroundColor: tokens.destructive,
    color: "#fff",
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 90%, transparent)`,
    },
    "&:focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
    },
    "&:is(.dark *)": {
      backgroundColor: `color-mix(in oklab, ${tokens.destructive} 60%, transparent)`,
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  }),
  outline: style("attachment-action-outline", {
    background: tokens.background,
    border: `1px solid ${tokens.border}`,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *)": {
      borderColor: tokens.input,
      background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    },
    "&:is(.dark *):hover": {
      background: `color-mix(in oklab, ${tokens.input} 50%, transparent)`,
    },
  }),
  secondary: style("attachment-action-secondary", {
    backgroundColor: tokens.secondary,
    color: tokens.secondaryForeground,
    "&:hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.secondary} 80%, transparent)`,
    },
  }),
  ghost: style("attachment-action-ghost", {
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "&:is(.dark *):hover": {
      backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    },
  }),
  link: style("attachment-action-link", {
    color: tokens.primary,
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }),
};

const buttonSizes = {
  default: style("attachment-action-size-default", {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }),
  xs: style("attachment-action-size-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    fontSize: "0.75rem",
    gap: "0.25rem",
    height: "1.5rem",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    "&:has(> svg)": {
      paddingInline: "0.375rem",
    },
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  sm: style("attachment-action-size-sm", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }),
  lg: style("attachment-action-size-lg", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }),
  icon: style("attachment-action-size-icon", {
    height: "2.25rem",
    width: "2.25rem",
  }),
  "icon-xs": style("attachment-action-size-icon-xs", {
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }),
  "icon-sm": style("attachment-action-size-icon-sm", {
    height: "2rem",
    width: "2rem",
  }),
  "icon-lg": style("attachment-action-size-icon-lg", {
    height: "2.5rem",
    width: "2.5rem",
  }),
};

css({
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-media']": {
    width: "100%",
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-media'] > [data-slot='spinner']": {
    height: "1.5rem !important",
    width: "1.5rem !important",
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-media'] svg:not([class*='size-'])": {
    height: "1.5rem",
    width: "1.5rem",
  },
  "[data-slot='attachment'][data-size='sm'] [data-slot='attachment-media']": {
    width: "2rem",
  },
  "[data-slot='attachment'][data-size='xs'] [data-slot='attachment-media']": {
    width: "1.75rem",
    borderRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "[data-slot='attachment'][data-size='xs'] [data-slot='attachment-media'] svg:not([class*='size-'])": {
    height: "0.875rem",
    width: "0.875rem",
  },
  "[data-slot='attachment'][data-state='error'] [data-slot='attachment-media']": {
    backgroundColor: `color-mix(in oklab, ${tokens.destructive} 10%, transparent)`,
    color: tokens.destructive,
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-content']": {
    paddingInline: "0.25rem",
  },
  "[data-slot='attachment'][data-state='done'] [data-slot='attachment-media'][data-variant='image']": {
    opacity: "1",
  },
  "[data-slot='attachment'][data-state='idle'] [data-slot='attachment-media'][data-variant='image']": {
    opacity: "1",
  },
  "[data-slot='attachment'][data-state='error'] [data-slot='attachment-description']": {
    color: `color-mix(in oklab, ${tokens.destructive} 80%, transparent)`,
  },
  "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-actions']": {
    position: "absolute",
    top: "0.75rem",
    right: "0.75rem",
    gap: "0.25rem",
  },
});

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

interface AttachmentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  state?: AttachmentState;
  size?: "default" | "sm" | "xs";
  orientation?: "horizontal" | "vertical";
}

export function Attachment({ state, size, orientation, children, class: cls, ...attrs }: AttachmentProps): HellaNode {
  return html`
    <div
      data-slot="attachment"
      data-state="${state ?? "done"}"
      data-size="${size ?? "default"}"
      data-orientation="${orientation ?? "horizontal"}"
      class="${
        [base, sizes[size ?? "default"], orientations[orientation ?? "horizontal"], cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AttachmentMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "icon" | "image";
  /** The owning Attachment's state; inlines the loading spinner on uploading and the error glyph on error when no children are authored. */
  state?: AttachmentState;
}

const loaderIcon = (): HellaNode => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
  </svg>` as HellaNode;

const errorIcon = (): HellaNode => html`
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path d="m15 9-6 6" />
    <path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" />
    <path d="m9 9 6 6" />
  </svg>` as HellaNode;

export function AttachmentMedia({ variant, state, children, class: cls, ...attrs }: AttachmentMediaProps): HellaNode {
  const autoIcon = (): HellaChildren | undefined => {
    if (children !== undefined) return undefined;
    if (state === "uploading") return loaderIcon();
    if (state === "error") return errorIcon();
    return undefined;
  };

  return html`
    <div
      data-slot="attachment-media"
      data-variant="${variant ?? "icon"}"
      class="${
        [media, mediaVariants[variant ?? "icon"], cls]
      }"
      ...${attrs}
    >${() => children ?? autoIcon()}</div>
  ` as HellaNode;
}

interface AttachmentContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentContent({ children, class: cls, ...attrs }: AttachmentContentProps): HellaNode {
  return html`
    <div
      data-slot="attachment-content"
      class="${
        [content, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AttachmentTitleProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentTitle({ children, class: cls, ...attrs }: AttachmentTitleProps): HellaNode {
  return html`
    <span
      data-slot="attachment-title"
      class="${
        [title, cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface AttachmentDescriptionProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentDescription({ children, class: cls, ...attrs }: AttachmentDescriptionProps): HellaNode {
  return html`
    <span
      data-slot="attachment-description"
      class="${
        [description, cls]
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface AttachmentActionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentActions({ children, class: cls, ...attrs }: AttachmentActionsProps): HellaNode {
  return html`
    <div
      data-slot="attachment-actions"
      class="${
        [actions, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface AttachmentActionProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export function AttachmentAction({ variant, size, children, class: cls, ...attrs }: AttachmentActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="attachment-action"
      data-variant="${variant ?? "ghost"}"
      data-size="${size ?? "icon-xs"}"
      class="${
        [buttonBase, buttonVariants[variant ?? "ghost"], buttonSizes[size ?? "icon-xs"], cls]
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface AttachmentTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentTrigger({ children, class: cls, ...attrs }: AttachmentTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="attachment-trigger"
      class="${
        [trigger, cls]
      }"
      ...${attrs}
    >${() => children}</button>
  ` as HellaNode;
}

interface AttachmentGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentGroup({ children, class: cls, ...attrs }: AttachmentGroupProps): HellaNode {
  return html`
    <div
      data-slot="attachment-group"
      class="${
        [group, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}
