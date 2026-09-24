import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

interface AttachmentProps {
  children?: HellaChildren;
  state?: AttachmentState;
  size?: "default" | "sm" | "xs";
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export function Attachment(props: AttachmentProps): JSX.Element {
  return (
    <div
      data-slot="attachment"
      data-state={props.state ?? "done"}
      data-size={props.size ?? "default"}
      data-orientation={props.orientation ?? "horizontal"}
      class={
        // @hella:compose
        [base, sizes[props.size ?? "default"], orientations[props.orientation ?? "horizontal"], props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface AttachmentMediaProps {
  children?: HellaChildren;
  variant?: "icon" | "image";
  /** The owning Attachment's state; inlines the loading spinner on uploading and the error glyph on error when no children are authored. */
  state?: AttachmentState;
  class?: string;
}

export function AttachmentMedia(props: AttachmentMediaProps): JSX.Element {
  const icon = (): HellaChildren | undefined => {
    if (props.children !== undefined) return undefined;
    if (props.state === "uploading") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
      );
    }
    if (props.state === "error") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 9-6 6" /><path d="M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" /><path d="m9 9 6 6" /></svg>
      );
    }
    return undefined;
  };

  return (
    <div
      data-slot="attachment-media"
      data-variant={props.variant ?? "icon"}
      class={
        // @hella:compose
        [media, mediaVariants[props.variant ?? "icon"], props.class]
        // @hella:end
      }
    >
      {() => props.children ?? icon()}
    </div>
  );
}

interface AttachmentContentProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentContent(props: AttachmentContentProps): JSX.Element {
  return (
    <div
      data-slot="attachment-content"
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

interface AttachmentTitleProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentTitle(props: AttachmentTitleProps): JSX.Element {
  return (
    <span
      data-slot="attachment-title"
      class={
        // @hella:compose
        [title, props.class]
        // @hella:end
      }
    >
      {props.children}
    </span>
  );
}

interface AttachmentDescriptionProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentDescription(props: AttachmentDescriptionProps): JSX.Element {
  return (
    <span
      data-slot="attachment-description"
      class={
        // @hella:compose
        [description, props.class]
        // @hella:end
      }
    >
      {props.children}
    </span>
  );
}

interface AttachmentActionsProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentActions(props: AttachmentActionsProps): JSX.Element {
  return (
    <div
      data-slot="attachment-actions"
      class={
        // @hella:compose
        [actions, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface AttachmentActionProps {
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  onclick?: () => void;
  class?: string;
}

export function AttachmentAction(props: AttachmentActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="attachment-action"
      data-variant={props.variant ?? "ghost"}
      data-size={props.size ?? "icon-xs"}
      class={
        // @hella:compose
        [buttonBase, buttonVariants[props.variant ?? "ghost"], buttonSizes[props.size ?? "icon-xs"], props.class]
        // @hella:end
      }
      on:click={() => props.onclick?.()}
    >
      {props.children}
    </button>
  );
}

interface AttachmentTriggerProps {
  children?: HellaChildren;
  type?: string;
  onclick?: () => void;
  class?: string;
}

export function AttachmentTrigger(props: AttachmentTriggerProps): JSX.Element {
  return (
    <button
      type={props.type ?? "button"}
      data-slot="attachment-trigger"
      class={
        // @hella:compose
        [trigger, props.class]
        // @hella:end
      }
      on:click={() => props.onclick?.()}
    >
      {props.children}
    </button>
  );
}

interface AttachmentGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function AttachmentGroup(props: AttachmentGroupProps): JSX.Element {
  return (
    <div
      data-slot="attachment-group"
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
