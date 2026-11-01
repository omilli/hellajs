import * as MessageScrollerCssJsx from "../../../dist/registry/message-scroller/css/message-scroller";
import * as MessageScrollerTailwindJsx from "../../../dist/registry/message-scroller/tailwind/message-scroller";
import type { Signal } from "@hellajs/core";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  PartVariant,
  ScrollerObserve,
} from "../../helpers/variants-core";

/** Prop bag for the compiled MessageScroller root (mirrors the emitted props). */
export interface MessageScrollerVariantProps extends CardPartProps {
  atBottom?: Signal<boolean>;
  scrollToBottom?: () => void;
  threshold?: number;
  observe?: ScrollerObserve;
  showScrollButton?: boolean;
}
/** The named MessageScroller parts except the MessageScroller root. */
export const MESSAGE_SCROLLER_PARTS = ["Item"] as const;
/**
 * Every compiled MessageScroller variant (the named MessageScroller export) at both styles.
 */
export const messageScrollerVariants: PartVariant<MessageScrollerVariantProps>[] = [
  {
    part: "MessageScroller",
    style: "css",
    render: (MessageScrollerCssJsx as unknown as AnyModule).MessageScroller as unknown as (
      props: MessageScrollerVariantProps,
    ) => JSX.Element,
  },
  {
    part: "MessageScroller",
    style: "tailwind",
    render: (MessageScrollerTailwindJsx as unknown as AnyModule).MessageScroller as unknown as (
      props: MessageScrollerVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled MessageScroller part (the Item row) at both styles.
 */
export const messageScrollerPartVariants: PartVariant<MessageScrollerVariantProps>[] =
  MESSAGE_SCROLLER_PARTS.flatMap((part) =>
    partVariants(part, "MessageScroller", [
      [MessageScrollerCssJsx as unknown as AnyModule, "css"],
      [MessageScrollerTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );
