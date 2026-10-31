import { isFunction, signal } from "@hellajs/core";
import type {
  CollapsibleComponents,
  CollapsibleContentProps,
  CollapsibleOptions,
  CollapsibleTriggerProps,
} from "./types/components";

/** The trigger id prefix: `hella-collapsible-trigger-<n>`, mirrored by the content's `aria-labelledby`. */
const TRIGGER_ID = "hella-collapsible-trigger-";

/** The content id prefix: `hella-collapsible-content-<n>`, mirrored by the trigger's `aria-controls`. */
const CONTENT_ID = "hella-collapsible-content-";

/** Module-level id counter: each factory call derives a unique trigger/content id pair. */
let collapsibleCount = 0;

/**
 * Creates the collapsible parts: `Trigger` + `Content`. The closure owns the open
 * state — controlled through an `open` accessor when passed, an internal signal
 * when omitted (`defaultOpen` seeds it). `Trigger` renders the toggle button's
 * aria contract and chains a user `on:click`; `Content` stays mounted under
 * `data-state` (CSS animates the collapse — no unmount/exit machine). Content
 * carries the generated region id paired with the trigger's `aria-controls`;
 * `active`/`onToggle` override for manual composition. Call in component scope
 * so the state signal disposes with the component.
 *
 * ```tsx
 * const { Trigger, Content } = collapsible({ open, onOpenChange });
 *
 * <Trigger>More</Trigger>
 * <Content>Details</Content>
 * ```
 * @param options controlled `open`, `defaultOpen` seed, and `onOpenChange`; an omitted `open` keeps state internal.
 * @returns The part set, plus the `isOpen` reader the composing root styles its own `data-state` from.
 */
export function collapsible(options: CollapsibleOptions = {}): CollapsibleComponents {
  const open = options.open;
  const onOpenChange = options.onOpenChange;
  const internal = signal(options.defaultOpen ?? false);
  const current = (): boolean => (open !== undefined ? open() : internal());
  const id = ++collapsibleCount;
  const triggerId = `${TRIGGER_ID}${id}`;
  const contentId = `${CONTENT_ID}${id}`;

  const toggle = (): void => {
    const next = !current();
    if (open === undefined) internal(next);
    onOpenChange?.(next);
  };

  const Trigger = (props: CollapsibleTriggerProps): JSX.Element => {
    const { active, onToggle, "on:click": userClick, children, class: cls, ...attrs } = props;
    const isActive = (): boolean =>
      active !== undefined ? (isFunction(active) ? active() : active) : current();

    return (
      <button
        type="button"
        data-slot="collapsible-trigger"
        id={triggerId}
        aria-expanded={isActive() ? "true" : "false"}
        aria-controls={contentId}
        data-state={isActive() ? "open" : "closed"}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          if (onToggle !== undefined) {
            onToggle();
            return;
          }
          toggle();
        }}
        {...attrs}
      >
        {children}
      </button>
    );
  };

  const Content = (props: CollapsibleContentProps): JSX.Element => {
    const { active, children, class: cls, ...attrs } = props;
    const isActive = (): boolean =>
      active !== undefined ? (isFunction(active) ? active() : active) : current();

    return (
      <div
        role="region"
        data-slot="collapsible-content"
        id={contentId}
        aria-labelledby={triggerId}
        data-state={isActive() ? "open" : "closed"}
        class={cls}
        {...attrs}
      >
        {children}
      </div>
    );
  };

  return { Trigger, Content, isOpen: current };
}
