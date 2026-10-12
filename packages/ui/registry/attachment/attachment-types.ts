import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export type AttachmentState = "idle" | "uploading" | "processing" | "error" | "done";

export interface AttachmentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  state?: AttachmentState;
  size?: "default" | "sm" | "xs";
  orientation?: "horizontal" | "vertical";
}

export interface AttachmentMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "icon" | "image";
  /** The owning Attachment's state; inlines the loading spinner on uploading and the error glyph on error when no children are authored. */
  state?: AttachmentState;
}

export interface AttachmentContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface AttachmentTitleProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export interface AttachmentDescriptionProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export interface AttachmentActionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export interface AttachmentActionProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export interface AttachmentTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
}

export interface AttachmentGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
