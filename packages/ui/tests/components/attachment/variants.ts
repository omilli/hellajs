import * as AttachmentCssJsx from "../../../dist/registry/attachment/css/attachment";
import * as AttachmentTailwindJsx from "../../../dist/registry/attachment/tailwind/attachment";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, CardPartProps, PartVariant } from "../../helpers/variants-core";

/** Prop bag for the compiled Attachment root (mirrors the emitted props). */
export interface AttachmentVariantProps extends CardPartProps {
  state?: "idle" | "uploading" | "processing" | "error" | "done";
  size?: "default" | "sm" | "xs";
  orientation?: "horizontal" | "vertical";
}
/** Prop bag for the compiled AttachmentMedia part (mirrors the emitted props). */
export interface AttachmentMediaVariantProps extends CardPartProps {
  variant?: "icon" | "image";
  state?: "idle" | "uploading" | "processing" | "error" | "done";
}
/** Prop bag for the compiled AttachmentAction part (mirrors the emitted props). */
export interface AttachmentActionVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}
/** Superset prop bag across Attachment parts. */
export type AttachmentPartVariantProps = AttachmentMediaVariantProps &
  Omit<AttachmentActionVariantProps, "variant">;
/** The named Attachment parts except the Attachment root. */
export const ATTACHMENT_PARTS = [
  "Media",
  "Content",
  "Title",
  "Description",
  "Actions",
  "Action",
  "Trigger",
  "Group",
] as const;
/**
 * Every compiled Attachment variant (the named Attachment export) at both styles.
 */
export const attachmentVariants: PartVariant<AttachmentVariantProps>[] = [
  {
    part: "Attachment",
    style: "css",
    render: (AttachmentCssJsx as unknown as AnyModule).Attachment as unknown as (
      props: AttachmentVariantProps,
    ) => JSX.Element,
  },
  {
    part: "Attachment",
    style: "tailwind",
    render: (AttachmentTailwindJsx as unknown as AnyModule).Attachment as unknown as (
      props: AttachmentVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled Attachment part (AttachmentMedia…AttachmentGroup) at both styles.
 */
export const attachmentPartVariants: PartVariant<AttachmentPartVariantProps>[] =
  ATTACHMENT_PARTS.flatMap((part) =>
    partVariants(part, "Attachment", [
      [AttachmentCssJsx as unknown as AnyModule, "css"],
      [AttachmentTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );
