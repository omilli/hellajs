import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { css, style } from "@hellajs/css";

const base = style({
  position: "relative",
  display: "flex",
  width: "fit-content",
  maxWidth: "100%",
  minWidth: "0",
  flexShrink: "0",
  flexWrap: "wrap",
  borderRadius: "calc(var(--radius) * 1.4)",
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  color: "var(--card-foreground)",
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&:focus-within": {
    boxShadow: "0 0 0 1px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:has(> a, > button):hover": {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  "&[data-state='error']": {
    borderColor: "color-mix(in oklab, var(--destructive) 30%, transparent)",
  },
  "&[data-state='idle']": {
    borderStyle: "dashed",
  },
}, { label: "hella-attachment", layer: "hella" });

const sizes = {
  default: style({
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
  }, { label: "hella-attachment-size-default", layer: "hella" }),
  sm: style({
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
  }, { label: "hella-attachment-size-sm", layer: "hella" }),
  xs: style({
    borderRadius: "calc(var(--radius) * 1)",
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
  }, { label: "hella-attachment-size-xs", layer: "hella" }),
};

const orientations = {
  horizontal: style({
    minWidth: "10rem",
    alignItems: "center",
  }, { label: "hella-attachment-horizontal", layer: "hella" }),
  vertical: style({
    width: "6rem",
    flexDirection: "column",
    "&:has([data-slot='attachment-content'])": {
      width: "7.5rem",
    },
  }, { label: "hella-attachment-vertical", layer: "hella" }),
};

const media = style({
  position: "relative",
  display: "flex",
  aspectRatio: "1 / 1",
  width: "2.5rem",
  flexShrink: "0",
  alignItems: "center",
  justifyContent: "center",
  overflow: "hidden",
  borderRadius: "calc(var(--radius) * 1)",
  backgroundColor: "var(--muted)",
  color: "var(--foreground)",
  "& svg": {
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-attachment-media", layer: "hella" });

const mediaVariants = {
  icon: style({}, { label: "hella-attachment-media-icon", layer: "hella" }),
  image: style({
    opacity: "0.6",
    "& > img": {
      aspectRatio: "1 / 1",
      width: "100%",
      objectFit: "cover",
    },
  }, { label: "hella-attachment-media-image", layer: "hella" }),
};

const content = style({
  maxWidth: "100%",
  minWidth: "0",
  flex: "1",
  lineHeight: "1.25",
}, { label: "hella-attachment-content", layer: "hella" });

const title = style({
  display: "block",
  maxWidth: "100%",
  minWidth: "0",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontWeight: "500",
}, { label: "hella-attachment-title", layer: "hella" });

const description = style({
  marginTop: "0.125rem",
  display: "block",
  minWidth: "0",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "0.75rem",
  lineHeight: "1rem",
  color: "var(--muted-foreground)",
}, { label: "hella-attachment-description", layer: "hella" });

const actions = style({
  position: "relative",
  zIndex: "20",
  display: "flex",
  flexShrink: "0",
  alignItems: "center",
}, { label: "hella-attachment-actions", layer: "hella" });

const trigger = style({
  position: "absolute",
  inset: "0",
  zIndex: "10",
  outlineStyle: "none",
}, { label: "hella-attachment-trigger", layer: "hella" });

const group = style({
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
}, { label: "hella-attachment-group", layer: "hella" });

const buttonBase = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
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
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-attachment-action", layer: "hella" });

const buttonVariants = {
  default: style({
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  }, { label: "hella-attachment-action-default", layer: "hella" }),
  destructive: style({
    backgroundColor: "var(--destructive)",
    color: "#fff",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 90%, transparent)",
    },
    "&:focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
    },
    "&:is(.dark *)": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 60%, transparent)",
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
    },
  }, { label: "hella-attachment-action-destructive", layer: "hella" }),
  outline: style({
    background: "var(--background)",
    border: "1px solid var(--border)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *)": {
      borderColor: "var(--input)",
      background: "color-mix(in oklab, var(--input) 30%, transparent)",
    },
    "&:is(.dark *):hover": {
      background: "color-mix(in oklab, var(--input) 50%, transparent)",
    },
  }, { label: "hella-attachment-action-outline", layer: "hella" }),
  secondary: style({
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    "&:hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
    },
  }, { label: "hella-attachment-action-secondary", layer: "hella" }),
  ghost: style({
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
    "&:is(.dark *):hover": {
      backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    },
  }, { label: "hella-attachment-action-ghost", layer: "hella" }),
  link: style({
    color: "var(--primary)",
    textUnderlineOffset: "4px",
    "&:hover": {
      textDecorationLine: "underline",
    },
  }, { label: "hella-attachment-action-link", layer: "hella" }),
};

const buttonSizes = {
  default: style({
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
    "&:has(> svg)": {
      paddingInline: "0.75rem",
    },
  }, { label: "hella-attachment-action-size-default", layer: "hella" }),
  xs: style({
    borderRadius: "calc(var(--radius) * 0.8)",
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
  }, { label: "hella-attachment-action-size-xs", layer: "hella" }),
  sm: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
    "&:has(> svg)": {
      paddingInline: "0.625rem",
    },
  }, { label: "hella-attachment-action-size-sm", layer: "hella" }),
  lg: style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "2.5rem",
    paddingInline: "1.5rem",
    "&:has(> svg)": {
      paddingInline: "1rem",
    },
  }, { label: "hella-attachment-action-size-lg", layer: "hella" }),
  icon: style({
    height: "2.25rem",
    width: "2.25rem",
  }, { label: "hella-attachment-action-size-icon", layer: "hella" }),
  "icon-xs": style({
    borderRadius: "calc(var(--radius) * 0.8)",
    height: "1.5rem",
    width: "1.5rem",
    "& svg:not([class*='size-'])": {
      height: "0.75rem",
      width: "0.75rem",
    },
  }, { label: "hella-attachment-action-size-icon-xs", layer: "hella" }),
  "icon-sm": style({
    height: "2rem",
    width: "2rem",
  }, { label: "hella-attachment-action-size-icon-sm", layer: "hella" }),
  "icon-lg": style({
    height: "2.5rem",
    width: "2.5rem",
  }, { label: "hella-attachment-action-size-icon-lg", layer: "hella" }),
};

css({
  "@layer hella": {
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
      borderRadius: "calc(var(--radius) * 0.8)",
    },
    "[data-slot='attachment'][data-size='xs'] [data-slot='attachment-media'] svg:not([class*='size-'])": {
      height: "0.875rem",
      width: "0.875rem",
    },
    "[data-slot='attachment'][data-state='error'] [data-slot='attachment-media']": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)",
      color: "var(--destructive)",
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
      color: "color-mix(in oklab, var(--destructive) 80%, transparent)",
    },
    "[data-slot='attachment'][data-orientation='vertical'] [data-slot='attachment-actions']": {
      position: "absolute",
      top: "0.75rem",
      right: "0.75rem",
      gap: "0.25rem",
    },
  },
});

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

interface AttachmentProps {
  children?: HellaChildren;
  state?: AttachmentState;
  size?: "default" | "sm" | "xs";
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export function Attachment(props: AttachmentProps): HellaNode {
  return html`
    <div
      data-slot="attachment"
      data-state="${props.state ?? "done"}"
      data-size="${props.size ?? "default"}"
      data-orientation="${props.orientation ?? "horizontal"}"
      class="${
        [base, sizes[props.size ?? "default"], orientations[props.orientation ?? "horizontal"], props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AttachmentMediaProps {
  children?: HellaChildren;
  variant?: "icon" | "image";
  /** The owning Attachment's state; inlines the loading spinner on uploading and the error glyph on error when no children are authored. */
  state?: AttachmentState;
  class?: string;
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

export function AttachmentMedia(props: AttachmentMediaProps): HellaNode {
  const autoIcon = (): HellaChildren | undefined => {
    if (props.children !== undefined) return undefined;
    if (props.state === "uploading") return loaderIcon();
    if (props.state === "error") return errorIcon();
    return undefined;
  };

  return html`
    <div
      data-slot="attachment-media"
      data-variant="${props.variant ?? "icon"}"
      class="${
        [media, mediaVariants[props.variant ?? "icon"], props.class]
      }"
    >${() => props.children ?? autoIcon()}</div>
  ` as HellaNode;
}

interface AttachmentContentProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentContent(props: AttachmentContentProps): HellaNode {
  return html`
    <div
      data-slot="attachment-content"
      class="${
        [content, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AttachmentTitleProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentTitle(props: AttachmentTitleProps): HellaNode {
  return html`
    <span
      data-slot="attachment-title"
      class="${
        [title, props.class]
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

interface AttachmentDescriptionProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentDescription(props: AttachmentDescriptionProps): HellaNode {
  return html`
    <span
      data-slot="attachment-description"
      class="${
        [description, props.class]
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

interface AttachmentActionsProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentActions(props: AttachmentActionsProps): HellaNode {
  return html`
    <div
      data-slot="attachment-actions"
      class="${
        [actions, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AttachmentActionProps {
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  onclick?: () => void;
  class?: string;
}

export function AttachmentAction(props: AttachmentActionProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="attachment-action"
      data-variant="${props.variant ?? "ghost"}"
      data-size="${props.size ?? "icon-xs"}"
      class="${
        [buttonBase, buttonVariants[props.variant ?? "ghost"], buttonSizes[props.size ?? "icon-xs"], props.class]
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface AttachmentTriggerProps {
  children?: HellaChildren;
  type?: string;
  onclick?: () => void;
  class?: string;
}

export function AttachmentTrigger(props: AttachmentTriggerProps): HellaNode {
  return html`
    <button
      type="${props.type ?? "button"}"
      data-slot="attachment-trigger"
      class="${
        [trigger, props.class]
      }"
      e:click="${() => props.onclick?.()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

interface AttachmentGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentGroup(props: AttachmentGroupProps): HellaNode {
  return html`
    <div
      data-slot="attachment-group"
      class="${
        [group, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}
