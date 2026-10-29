import { effect, isFunction, signal } from "@hellajs/core";
import { Portal } from "@hellajs/dom";
import { menuTypeahead } from "./menuTypeahead";
import { anchoredLayer } from "./internal/anchoredLayer";
import { domOptions, listboxKeydown, selectionActive, typeaheadEntries } from "./internal/listbox";
import type { ListboxModel } from "./internal/listbox";
import type {
  SelectContentProps,
  SelectItemProps,
  SelectLabelProps,
  SelectOptions,
  SelectPartProps,
  SelectParts,
  SelectScrollButtonProps,
  SelectTriggerProps,
  SelectValueProps,
} from "./types/parts";

/** The check icon (refs/icons/check.svg), created per call so reactive swaps never share nodes between clones. */
const checkIcon = (): JSX.Element => (
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
    aria-hidden="true"
    data-slot="select-check-icon"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** The chevron-down icon (refs/icons/chevron-down.svg), created per call so reactive swaps never share nodes between clones. */
const chevronDownIcon = (): JSX.Element => (
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
    aria-hidden="true"
    data-slot="select-chevron"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** The chevron-up icon (refs/icons/chevron-up.svg), created per call so reactive swaps never share nodes between clones. */
const chevronUpIcon = (): JSX.Element => (
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
    aria-hidden="true"
    data-slot="select-chevron-up"
  >
    <path d="m18 15-6-6-6 6" />
  </svg>
);

/** The clear icon (refs/icons/x.svg), created per call so reactive swaps never share nodes between clones. */
const clearIcon = (): JSX.Element => (
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
    aria-hidden="true"
    data-slot="select-clear-icon"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

/** Open/close state: controlled override, exit-holding `visible` gate so an open→closed flip never unmounts before the exit starts. */
function selectOpenState(options: {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const internal = signal(false);
  const isOpen = (): boolean => (options.open !== undefined ? options.open() : internal());
  const setOpen = (next: boolean): void => {
    if (options.open === undefined) internal(next);
    options.onOpenChange?.(next);
  };
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading isOpen() in the template
  // would flash the subtree away one evaluation early).
  const visible = signal(false);
  let wasOpen = false;
  let fallback: ReturnType<typeof setTimeout> | undefined;
  const finishExit = (): void => {
    if (fallback !== undefined) {
      clearTimeout(fallback);
      fallback = undefined;
    }
    visible(false);
  };
  // Flip to open renders immediately; flip to closed starts the exit - the
  // content stays mounted under data-state="closed" until its animationend
  // (or the copied duration budget) unmounts it.
  effect(() => {
    if (isOpen()) {
      wasOpen = true;
      finishExit();
      visible(true);
    } else if (wasOpen) {
      wasOpen = false;
      visible(true);
      fallback = setTimeout(finishExit, 250);
    }
  });
  return {
    isOpen,
    setOpen,
    state: (): "open" | "closed" => (isOpen() ? "open" : "closed"),
    visible,
    finishExit,
  };
}

let selectCount = 0;

/**
 * Creates the select part set: `Trigger`, `Value`, the portaled `Content`
 * listbox (scroll buttons + viewport, typeahead, roving arrows, scroll-edge
 * visibility), and the structural parts (`Group`, `Item`, `Label`,
 * `Separator`, `ScrollUpButton`, `ScrollDownButton`). Options register in DOM
 * order from the rendered `Item` children; the closure owns the selection
 * (controlled through a `value` getter when passed, an internal signal when
 * omitted) and the exit machine. `Content` portals to `document.body`,
 * anchors to the trigger, lands focus on the selected option, and closing
 * returns focus to the trigger. Call in component scope so the state
 * machine's effect disposes with the component.
 *
 * ```tsx
 * const Select = select({ value, onValueChange });
 *
 * <Select.Trigger>
 *   <Select.Value placeholder="Choose…" />
 * </Select.Trigger>
 * <Select.Content side="bottom">
 *   <Select.Item value="a">Option A</Select.Item>
 *   <Select.Group><Select.Label>Group</Select.Label>…</Select.Group>
 * </Select.Content>
 * ```
 * @param options Controlled-or-internal `value` + `onValueChange`; an omitted `value` keeps the selection internal.
 * @returns The part set, composed as `Select.Trigger`-style members.
 */
export function select(options: SelectOptions = {}): SelectParts {
  const s = selectOpenState(options);
  const contentId = `hella-select-content-${++selectCount}`;
  const value = options.value;
  const internal = signal("");
  const current = (): string => (value !== undefined ? value() : internal());
  const selectValue = (next: string): void => {
    if (value === undefined) internal(next);
    options.onValueChange?.(next);
  };
  let triggerNode: HTMLElement | undefined;
  let contentNode: HTMLElement | undefined;

  const highlight = (optionValue: string): void => {
    if (!contentNode) return;
    const found = domOptions(contentNode).find((option) => option.value === optionValue);
    if (!found?.node) return;
    const previous = contentNode.querySelectorAll("[data-highlighted]");
    let i = 0;
    while (i < previous.length) {
      (previous[i] as HTMLElement).removeAttribute("data-highlighted");
      i++;
    }
    found.node.setAttribute("data-highlighted", "true");
    found.node.focus();
  };

  const model: ListboxModel = {
    options: () => (contentNode ? domOptions(contentNode) : []),
    active: () => {
      const focused = document.activeElement;
      const registered = model.options();
      let i = 0;
      const len = registered.length;
      while (i < len) {
        if (registered[i]!.node === focused) return registered[i]!.value;
        i++;
      }
      return undefined;
    },
    isSelected: (optionValue) => current() === optionValue,
    highlight,
    commit: (optionValue) => {
      selectValue(optionValue);
      s.setOpen(false);
    },
    close: () => s.setOpen(false),
  };

  // Focus returns to the trigger when the listbox closes (one open→closed
  // flip only, so the initial closed state never steals focus at mount).
  let wasOpenForFocus = false;
  effect(() => {
    if (s.isOpen()) wasOpenForFocus = true;
    else if (wasOpenForFocus) {
      wasOpenForFocus = false;
      if (triggerNode?.isConnected) triggerNode.focus();
    }
  });

  /** Wires the scroll buttons' hover-repeat stepping and the edge-visibility sync against the listbox's scroll position. */
  const wireScroll = (node: HTMLElement, push: (dispose: () => void) => void): void => {
    const up = node.querySelector("[data-slot='select-scroll-up-button']");
    const down = node.querySelector("[data-slot='select-scroll-down-button']");
    const syncEdges = (): void => {
      if (up instanceof HTMLElement)
        up.style.visibility = node.scrollTop <= 0 ? "hidden" : "visible";
      if (down instanceof HTMLElement)
        down.style.visibility =
          node.scrollTop + node.clientHeight >= node.scrollHeight ? "hidden" : "visible";
    };
    const wireStep = (el: Element | null, delta: number): void => {
      if (!(el instanceof HTMLElement)) return;
      let timer: ReturnType<typeof setInterval> | null = null;
      const start = (): void => {
        if (timer !== null) return;
        node.scrollTop = node.scrollTop + delta;
        timer = setInterval(() => {
          node.scrollTop = node.scrollTop + delta;
        }, 50);
      };
      const stop = (): void => {
        if (timer === null) return;
        clearInterval(timer);
        timer = null;
      };
      el.addEventListener("pointerenter", start);
      el.addEventListener("pointerleave", stop);
      push(() => {
        el.removeEventListener("pointerenter", start);
        el.removeEventListener("pointerleave", stop);
        stop();
      });
    };
    wireStep(up, -32);
    wireStep(down, 32);
    node.addEventListener("scroll", syncEdges);
    push(() => node.removeEventListener("scroll", syncEdges));
    syncEdges();
  };

  const Trigger = (props: SelectTriggerProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      id,
      size,
      state: stateProp,
      onOpen,
      clearable,
      onClear,
      hasValue,
      disabled,
      "on:click": userClick,
      ...attrs
    } = props;
    const state = stateProp ?? s.state;
    const selected = (): boolean => (hasValue ? hasValue() : current() !== "");
    const open = (): void => {
      if (disabled) return;
      if (onOpen) onOpen();
      else s.setOpen(!s.isOpen());
    };
    return (
      <button
        type="button"
        data-slot="select-trigger"
        id={id}
        data-size={size ?? "default"}
        data-state={state()}
        aria-haspopup="listbox"
        aria-expanded={() => (state() === "open" ? "true" : "false")}
        aria-controls={contentId}
        disabled={disabled}
        class={cls}
        on:click={function (e) {
          userClick?.call(this, e);
          open();
        }}
        on:keydown={(e) => {
          const key = (e as KeyboardEvent).key;
          if (disabled || (key !== "ArrowDown" && key !== "ArrowUp")) return;
          e.preventDefault();
          open();
        }}
        hook:afterMount={(node) => {
          if (node instanceof HTMLElement) triggerNode = node;
        }}
        {...attrs}
      >
        {children}
        {() =>
          clearable && selected() ? (
            <span
              data-slot="select-clear"
              role="button"
              aria-label="Clear"
              on:click={(e) => {
                e.stopPropagation();
                if (onClear) onClear();
                else selectValue("");
              }}
            >
              {clearIcon()}
            </span>
          ) : null
        }
        {chevronDownIcon()}
      </button>
    );
  };

  const Value = (props: SelectValueProps = {}): JSX.Element => {
    const { placeholder, value: valueProp, class: cls, ...attrs } = props;
    const shown = (): unknown => {
      if (isFunction(valueProp)) return valueProp();
      if (valueProp !== undefined) return valueProp;
      const selected = current();
      return selected === "" ? undefined : selected;
    };
    return (
      <span
        data-slot="select-value"
        data-placeholder={() => {
          const v = shown();
          return v === undefined || v === "" ? "" : undefined;
        }}
        class={cls}
        {...attrs}
      >
        {() => {
          const v = shown();
          return v === undefined || v === "" ? placeholder : v;
        }}
      </span>
    );
  };

  const Content = (props: SelectContentProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      id,
      side: sideProp,
      align: alignProp,
      sideOffset: sideOffsetProp,
      anchor: anchorProp,
      onExited,
      ...attrs
    } = props;
    const side = sideProp ?? "bottom";
    const align = alignProp ?? "start";
    const sideOffset = sideOffsetProp ?? 6;
    // The gate is a region OUTSIDE the Portal: portals mount once, so the
    // whole portal must reconstruct per open for the mount walk (and the
    // engine's afterMount wiring) to run against fresh content.
    return (
      <>
        {() =>
          s.visible() && (
            <Portal to="body">
              <div
                role="listbox"
                tabindex="-1"
                id={id ?? contentId}
                data-slot="select-content"
                data-state={s.state()}
                data-side={side}
                data-align={align}
                class={cls}
                {...attrs}
                hook:afterMount={(node) => {
                  if (!(node instanceof HTMLElement)) return;
                  contentNode = node;
                  anchoredLayer(node, {
                    state: s.state,
                    anchor: () => anchorProp?.() ?? triggerNode,
                    side,
                    align,
                    sideOffset,
                    matchAnchorWidth: true,
                    // Open focus lands on the selected enabled option (first
                    // enabled otherwise, the node itself when empty) and
                    // scrolls it to the visible edge.
                    focusTarget: (): HTMLElement => {
                      const landing = selectionActive(model);
                      if (landing === undefined) {
                        node.focus();
                        return node;
                      }
                      highlight(landing);
                      const target = domOptions(node).find(
                        (option) => option.value === landing,
                      )?.node;
                      target?.scrollIntoView?.({ block: "nearest" });
                      return target ?? node;
                    },
                    onDismiss: () => s.setOpen(false),
                    onExited: () => {
                      s.finishExit();
                      onExited?.();
                    },
                    arm: (push) => {
                      push(
                        menuTypeahead(
                          node,
                          () => typeaheadEntries(model),
                          (record) => {
                            const optionValue = record.node.dataset.value;
                            if (optionValue !== undefined) highlight(optionValue);
                          },
                        ),
                      );
                      const onKey = listboxKeydown(model);
                      node.addEventListener("keydown", onKey);
                      push(() => node.removeEventListener("keydown", onKey));
                      wireScroll(node, push);
                    },
                  });
                }}
                hook:beforeDestroy={() => {
                  contentNode = undefined;
                }}
              >
                <div data-slot="select-scroll-up-button">{chevronUpIcon()}</div>
                <div data-slot="select-viewport">{children}</div>
                <div data-slot="select-scroll-down-button">{chevronDownIcon()}</div>
              </div>
            </Portal>
          )
        }
      </>
    );
  };

  const Group = (props: SelectPartProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="select-group" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Item = (props: SelectItemProps = {}): JSX.Element => {
    const {
      children,
      class: cls,
      value,
      label: labelSlot,
      selected: selectedProp,
      onselect,
      disabled,
      ...attrs
    } = props;
    const selected = (): boolean =>
      isFunction(selectedProp)
        ? selectedProp()
        : (selectedProp ?? (value !== undefined && current() === value));
    return (
      <div
        role="option"
        tabindex="-1"
        data-slot="select-item"
        data-value={value}
        aria-selected={selected() ? "true" : "false"}
        data-state={selected() ? "checked" : "unchecked"}
        data-disabled={disabled ? "true" : undefined}
        aria-disabled={disabled ? "true" : undefined}
        class={cls}
        on:click={() => {
          if (disabled) return;
          if (onselect) onselect();
          else if (value !== undefined) model.commit(value);
        }}
        {...attrs}
      >
        <span data-slot="select-item-indicator">{() => (selected() ? checkIcon() : null)}</span>
        {() => children ?? labelSlot}
      </div>
    );
  };

  const Label = (props: SelectLabelProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="select-label" class={cls} {...attrs}>
        {children}
      </div>
    );
  };

  const Separator = (props: SelectPartProps = {}): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return <div role="separator" data-slot="select-separator" class={cls} {...attrs} />;
  };

  const ScrollUpButton = (props: SelectScrollButtonProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="select-scroll-up-button" class={cls} {...attrs}>
        {() => children ?? chevronUpIcon()}
      </div>
    );
  };

  const ScrollDownButton = (props: SelectScrollButtonProps = {}): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <div data-slot="select-scroll-down-button" class={cls} {...attrs}>
        {() => children ?? chevronDownIcon()}
      </div>
    );
  };

  return {
    Trigger,
    Value,
    Content,
    Group,
    Item,
    Label,
    Separator,
    ScrollUpButton,
    ScrollDownButton,
  };
}
