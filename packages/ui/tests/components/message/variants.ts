import * as MessageCssJsx from "../../../dist/registry/message/css/message";
import * as MessageTailwindJsx from "../../../dist/registry/message/tailwind/message";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, CardPartProps, PartVariant } from "../../helpers/variants-core";

/** Prop bag for the compiled Message root (mirrors the emitted props). */
export interface MessageVariantProps extends CardPartProps {
  align?: "start" | "end";
}
/** The named Message parts except the Message root (mirrors the emitted props). */
export const MESSAGE_PARTS = ["Group", "Avatar", "Content", "Header", "Footer"] as const;
/**
 * Every compiled Message variant (the named Message export) at both styles.
 */
export const messageVariants: PartVariant<MessageVariantProps>[] = [
  {
    part: "Message",
    style: "css",
    render: (MessageCssJsx as unknown as AnyModule).Message as unknown as (
      props: MessageVariantProps,
    ) => JSX.Element,
  },
  {
    part: "Message",
    style: "tailwind",
    render: (MessageTailwindJsx as unknown as AnyModule).Message as unknown as (
      props: MessageVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled Message part (MessageGroup, MessageAvatar, MessageContent, MessageHeader, MessageFooter) at both styles.
 */
export const messagePartVariants: PartVariant<CardPartProps>[] = MESSAGE_PARTS.flatMap((part) =>
  partVariants(part, "Message", [
    [MessageCssJsx as unknown as AnyModule, "css"],
    [MessageTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);
