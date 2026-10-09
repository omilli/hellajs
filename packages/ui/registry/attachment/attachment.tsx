import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const actions: string;
declare const base: string;
declare const buttonBase: string;
declare const buttonSizes: Record<string, string>;
declare const buttonVariants: Record<string, string>;
declare const content: string;
declare const description: string;
declare const group: string;
declare const media: string;
declare const mediaVariants: Record<string, string>;
declare const orientations: Record<string, string>;
declare const sizes: Record<string, string>;
declare const title: string;
declare const trigger: string;
// @hella:end

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

interface AttachmentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  state?: AttachmentState;
  size?: "default" | "sm" | "xs";
  orientation?: "horizontal" | "vertical";
}

export function Attachment({ state, size, orientation, children, class: cls, ...attrs }: AttachmentProps): JSX.Element {
  return (
    <div
      data-slot="attachment"
      data-state={state ?? "done"}
      data-size={size ?? "default"}
      data-orientation={orientation ?? "horizontal"}
      class={
        // @hella:compose
        [base, sizes[size ?? "default"], orientations[orientation ?? "horizontal"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface AttachmentMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "icon" | "image";
  /** The owning Attachment's state; inlines the loading spinner on uploading and the error glyph on error when no children are authored. */
  state?: AttachmentState;
}

export function AttachmentMedia({ variant, state, children, class: cls, ...attrs }: AttachmentMediaProps): JSX.Element {
  const icon = (): HellaChildren | undefined => {
    if (children !== undefined) return undefined;
    if (state === "uploading") {
      return (
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
        </svg>
      );
    }
    if (state === "error") {
      return (
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
        </svg>
      );
    }
    return undefined;
  };

  return (
    <div
      data-slot="attachment-media"
      data-variant={variant ?? "icon"}
      class={
        // @hella:compose
        [media, mediaVariants[variant ?? "icon"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {() => children ?? icon()}
    </div>
  );
}

interface AttachmentContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentContent({ children, class: cls, ...attrs }: AttachmentContentProps): JSX.Element {
  return (
    <div
      data-slot="attachment-content"
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

interface AttachmentTitleProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentTitle({ children, class: cls, ...attrs }: AttachmentTitleProps): JSX.Element {
  return (
    <span
      data-slot="attachment-title"
      class={
        // @hella:compose
        [title, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface AttachmentDescriptionProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentDescription({ children, class: cls, ...attrs }: AttachmentDescriptionProps): JSX.Element {
  return (
    <span
      data-slot="attachment-description"
      class={
        // @hella:compose
        [description, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

interface AttachmentActionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentActions({ children, class: cls, ...attrs }: AttachmentActionsProps): JSX.Element {
  return (
    <div
      data-slot="attachment-actions"
      class={
        // @hella:compose
        [actions, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface AttachmentActionProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export function AttachmentAction({ variant, size, children, class: cls, ...attrs }: AttachmentActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="attachment-action"
      data-variant={variant ?? "ghost"}
      data-size={size ?? "icon-xs"}
      class={
        // @hella:compose
        [buttonBase, buttonVariants[variant ?? "ghost"], buttonSizes[size ?? "icon-xs"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

interface AttachmentTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentTrigger({ children, class: cls, ...attrs }: AttachmentTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="attachment-trigger"
      class={
        // @hella:compose
        [trigger, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

interface AttachmentGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function AttachmentGroup({ children, class: cls, ...attrs }: AttachmentGroupProps): JSX.Element {
  return (
    <div
      data-slot="attachment-group"
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
