import { effect, signal } from "@hellajs/core";
import { anchorPosition, html, layerDismissal, menuTypeahead, Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren, HellaNode, Placement } from "@hellajs/dom";

import { css, keyframes, style } from "@hellajs/css";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style({
  alignItems: "center",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  height: "2.25rem",
  minWidth: "0",
  outlineStyle: "none",
  position: "relative",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:has(> textarea)": {
    height: "auto",
  },
  "&:has(> [data-align='inline-start']) > input": {
    paddingLeft: "0.5rem",
  },
  "&:has(> [data-align='inline-end']) > input": {
    paddingRight: "0.5rem",
  },
  "&:has([data-slot='input-group-control']:focus-visible)": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:has([data-slot][aria-invalid='true'])": {
    borderColor: "var(--destructive)",
  },
  "&:has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *):has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-combobox-wrapper", layer: "hella" });

const input = style({
  background: "transparent",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  fontSize: "1rem",
  height: "2.25rem",
  lineHeight: "1.5rem",
  minWidth: "0",
  outlineStyle: "none",
  paddingBlock: "0.25rem",
  paddingInline: "0.75rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&::file-selector-button": {
    background: "transparent",
    border: "none",
    color: "var(--foreground)",
    display: "inline-flex",
    fontSize: "0.875rem",
    fontWeight: "500",
    height: "1.75rem",
  },
  "&::placeholder": {
    color: "var(--muted-foreground)",
  },
  "&::selection": {
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
    pointerEvents: "none",
  },
  "@media (min-width: 48rem)": {
    "&": {
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
    },
  },
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
}, { label: "hella-combobox-input", layer: "hella" });

const inputFocus = style({
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
}, { label: "hella-combobox-input-focus", layer: "hella" });

const inputInvalid = style({
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-combobox-input-invalid", layer: "hella" });

const inputControl = style({
  background: "transparent",
  borderRadius: "0",
  borderWidth: "0",
  flex: "1 1 0%",
  boxShadow: "none",
  "&:focus-visible": {
    boxShadow: "none",
  },
  "&:is(.dark *)": {
    background: "transparent",
  },
}, { label: "hella-combobox-input-control", layer: "hella" });

const addon = style({
  alignItems: "center",
  color: "var(--muted-foreground)",
  cursor: "text",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "auto",
  justifyContent: "center",
  order: "9999",
  paddingBlock: "0.375rem",
  paddingRight: "0.75rem",
  userSelect: "none",
  "&:has(> button)": {
    marginRight: "-0.45rem",
  },
  "&:has(> kbd)": {
    marginRight: "-0.35rem",
  },
  "& > kbd": {
    borderRadius: "calc(var(--radius) - 5px)",
  },
  "& > svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&[data-disabled='true']": {
    opacity: "0.5",
  },
}, { label: "hella-combobox-addon", layer: "hella" });

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
}, { label: "hella-combobox-button", layer: "hella" });

const buttonGhost = style({
  "&:hover": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:is(.dark *):hover": {
    backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
  },
}, { label: "hella-combobox-button-ghost", layer: "hella" });

const buttonSizeIconXs = style({
  borderRadius: "calc(var(--radius) * 0.8)",
  height: "1.5rem",
  width: "1.5rem",
  "& svg:not([class*='size-'])": {
    height: "0.75rem",
    width: "0.75rem",
  },
}, { label: "hella-combobox-button-size-icon-xs", layer: "hella" });

const sizeIconXs = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) - 5px)",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  height: "1.5rem",
  padding: "0",
  boxShadow: "none",
  "&:has(> svg)": {
    padding: "0",
  },
}, { label: "hella-combobox-size-icon-xs", layer: "hella" });

const triggerExtra = style({
  "&[data-pressed]": {
    backgroundColor: "transparent",
  },
}, { label: "hella-combobox-trigger-extra", layer: "hella" });

const chipRemoveExtra = style({
  marginLeft: "-0.25rem",
  opacity: "0.5",
  "&:hover": {
    opacity: "1",
  },
}, { label: "hella-combobox-chip-remove-extra", layer: "hella" });

const trigger = style({
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-combobox-trigger", layer: "hella" });

const triggerIcon = style({
  color: "var(--muted-foreground)",
  height: "1rem",
  pointerEvents: "none",
  width: "1rem",
}, { label: "hella-combobox-trigger-icon", layer: "hella" });

const content = style({
  backgroundColor: "var(--popover)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1), 0 0 0 1px color-mix(in oklab, var(--foreground) 10%, transparent)",
  color: "var(--popover-foreground)",
  maxHeight: "24rem",
  maxWidth: "var(--available-width)",
  minWidth: "calc(var(--anchor-width) + 1.75rem)",
  overflow: "hidden",
  position: "relative",
  transformOrigin: "var(--transform-origin)",
  transitionDuration: "100ms",
  width: "var(--anchor-width)",
  "&[data-chips='true']": {
    minWidth: "var(--anchor-width)",
  },
  "& > [data-slot='input-group']": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
    borderColor: "color-mix(in oklab, var(--input) 30%, transparent)",
    boxShadow: "none",
    height: "2rem",
    margin: "0.25rem",
    marginBottom: "0",
  },
  "&[data-side='bottom']": {
    translate: "0 0.25rem",
  },
  "&[data-side='left']": {
    translate: "-0.25rem 0",
  },
  "&[data-side='right']": {
    translate: "0.25rem 0",
  },
  "&[data-side='top']": {
    translate: "0 -0.25rem",
  },
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 100ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 100ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 100ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 100ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 100ms ease-in both`,
  },
}, { label: "hella-combobox-content", layer: "hella" });

const list = style({
  maxHeight: "min(calc(24rem - 2.25rem), calc(var(--available-height) - 2.25rem))",
  overflowY: "auto",
  padding: "0.25rem",
  scrollPaddingBlock: "0.25rem",
  "&[data-empty]": {
    padding: "0",
  },
}, { label: "hella-combobox-list", layer: "hella" });

const item = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.375rem",
  paddingLeft: "0.5rem",
  paddingRight: "2rem",
  position: "relative",
  userSelect: "none",
  width: "100%",
  "&[data-highlighted]": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-combobox-item", layer: "hella" });

const itemIndicator = style({
  alignItems: "center",
  display: "flex",
  height: "1rem",
  justifyContent: "center",
  pointerEvents: "none",
  position: "absolute",
  right: "0.5rem",
  width: "1rem",
}, { label: "hella-combobox-item-indicator", layer: "hella" });

const icon = style({
  height: "1rem",
  pointerEvents: "none",
  width: "1rem",
  "@media (pointer: coarse)": {
    "&": {
      height: "1.25rem",
      width: "1.25rem",
    },
  },
}, { label: "hella-combobox-icon", layer: "hella" });

const xIcon = style({
  pointerEvents: "none",
}, { label: "hella-combobox-x-icon", layer: "hella" });

const label = style({
  color: "var(--muted-foreground)",
  fontSize: "0.75rem",
  lineHeight: "1rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "@media (pointer: coarse)": {
    "&": {
      fontSize: "0.875rem",
      lineHeight: "1.25rem",
      paddingBlock: "0.5rem",
      paddingInline: "0.75rem",
    },
  },
}, { label: "hella-combobox-label", layer: "hella" });

const empty = style({
  color: "var(--muted-foreground)",
  display: "none",
  fontSize: "0.875rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  paddingBlock: "0.5rem",
  textAlign: "center",
  width: "100%",
  "&:is([data-slot='combobox-content'][data-empty] *)": {
    display: "flex",
  },
}, { label: "hella-combobox-empty", layer: "hella" });

const separator = style({
  backgroundColor: "var(--border)",
  height: "1px",
  marginBlock: "0.25rem",
  marginInline: "-0.25rem",
}, { label: "hella-combobox-separator", layer: "hella" });

const chips = style({
  alignItems: "center",
  backgroundClip: "padding-box",
  backgroundColor: "transparent",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.875rem",
  gap: "0.375rem",
  lineHeight: "1.25rem",
  minHeight: "2.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.625rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:focus-within": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:has([aria-invalid='true'])": {
    borderColor: "var(--destructive)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:has([data-slot='combobox-chip'])": {
    paddingInline: "0.375rem",
  },
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:is(.dark *):has([aria-invalid='true'])": {
    borderColor: "color-mix(in oklab, var(--destructive) 50%, transparent)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-combobox-chips", layer: "hella" });

const chip = style({
  alignItems: "center",
  backgroundColor: "var(--muted)",
  borderRadius: "calc(var(--radius) * 0.6)",
  color: "var(--foreground)",
  display: "flex",
  fontSize: "0.75rem",
  fontWeight: "500",
  gap: "0.25rem",
  height: "1.375rem",
  justifyContent: "center",
  paddingInline: "0.375rem",
  whiteSpace: "nowrap",
  width: "fit-content",
  "&:has(:disabled)": {
    cursor: "not-allowed",
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:has([data-slot='combobox-chip-remove'])": {
    paddingRight: "0",
  },
}, { label: "hella-combobox-chip", layer: "hella" });

const chipsInput = style({
  flex: "1 1 0%",
  minWidth: "4rem",
  outlineStyle: "none",
}, { label: "hella-combobox-chips-input", layer: "hella" });

css({
  "@layer hella": {
    "[data-slot='input-group']:has([data-slot='combobox-clear']) [data-slot='combobox-trigger']": {
      display: "none",
    },
  },
});

type AnchorSide = "top" | "bottom" | "left" | "right";
type AnchorAlign = "start" | "center" | "end";

const placementOf = (side: AnchorSide, align: AnchorAlign): Placement =>
  align === "center" ? side : `${side}-${align}`;

interface ComboboxEntry {
  value: string;
  label?: string;
  disabled?: boolean;
}

/** Open/close state: exit-holding `visible` gate so an open→closed flip never unmounts before the exit starts. */
function comboboxOpenState() {
  const internal = signal(false);
  const isOpen = (): boolean => internal();
  const setOpen = (next: boolean): void => {
    internal(next);
  };
  // `visible` alone gates the render so an open→closed flip never unmounts
  // before this watcher starts the exit (reading open() in the template
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
  return { isOpen, setOpen, state: (): "open" | "closed" => (isOpen() ? "open" : "closed"), visible, finishExit };
}

/** The check icon (refs/icons/check.svg), created per call so reactive swaps never share nodes between clones. */
const checkIcon = (): HellaNode =>
  html`<svg
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
    class="${
      [icon]
    }"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>` as HellaNode;

/** The chevron-down icon (refs/icons/chevron-down.svg), created per call so reactive swaps never share nodes between clones. */
const chevronDownIcon = (): HellaNode =>
  html`<svg
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
    data-slot="combobox-trigger-icon"
    class="${
      [triggerIcon]
    }"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>` as HellaNode;

/** The clear icon (refs/icons/x.svg), created per call so reactive swaps never share nodes between clones. */
const clearIcon = (): HellaNode =>
  html`<svg
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
    class="${
      [xIcon]
    }"
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>` as HellaNode;

interface ComboboxValueProps {
  /** The displayed selection. A string reads statically; an accessor keeps it reactive; an array joins with ", ". */
  value?: string | string[] | (() => string | string[] | undefined);
  class?: string;
}

/** Renders the selected value for compositions that show the selection outside the input. */
export function ComboboxValue(props: ComboboxValueProps): HellaNode {
  const current = (): string | string[] | undefined =>
    typeof props.value === "function" ? props.value() : props.value;
  return html`
    <span
      data-slot="combobox-value"
      class="${
        [props.class]
      }"
    >${() => {
      const v = current();
      return Array.isArray(v) ? v.join(", ") : v;
    }}</span>
  ` as HellaNode;
}

interface ComboboxTriggerProps {
  children?: HellaChildren;
  onclick?: () => void;
  disabled?: boolean;
  class?: string;
}

/** The manual trigger button; the composed Combobox renders its chevron twin inside the input-group addon. */
export function ComboboxTrigger(props: ComboboxTriggerProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="combobox-trigger"
      disabled="${props.disabled}"
      class="${
        [trigger, props.class]
      }"
      on:click="${() => props.onclick?.()}"
    >
      ${() => props.children}${chevronDownIcon()}
    </button>
  ` as HellaNode;
}

interface ComboboxClearProps {
  /** Called on click; the composed Combobox wipes the selection. */
  onClear?: () => void;
  disabled?: boolean;
  class?: string;
}

/** The clear affordance, styled as the input-group's ghost icon-xs button. */
export function ComboboxClear(props: ComboboxClearProps): HellaNode {
  return html`
    <button
      type="button"
      data-slot="combobox-clear"
      aria-label="Clear"
      disabled="${props.disabled}"
      class="${
        [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, props.class]
      }"
      on:click="${() => props.onClear?.()}"
    >${clearIcon()}</button>
  ` as HellaNode;
}

interface ComboboxGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function ComboboxGroup(props: ComboboxGroupProps): HellaNode {
  return html`
    <div
      data-slot="combobox-group"
      class="${
        [props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ComboboxLabelProps {
  children?: HellaChildren;
  class?: string;
}

export function ComboboxLabel(props: ComboboxLabelProps): HellaNode {
  return html`
    <div
      data-slot="combobox-label"
      class="${
        [label, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ComboboxCollectionProps {
  children?: HellaChildren;
  class?: string;
}

/** Passthrough wrapper grouping items rendered from external data. */
export function ComboboxCollection(props: ComboboxCollectionProps): HellaNode {
  return html`
    <div
      data-slot="combobox-collection"
      class="${props.class}"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ComboboxEmptyProps {
  children?: HellaChildren;
  class?: string;
}

/** Renders when the query matches nothing; the composed Combobox mounts it with its default text. */
export function ComboboxEmpty(props: ComboboxEmptyProps): HellaNode {
  return html`
    <div
      data-slot="combobox-empty"
      class="${
        [empty, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ComboboxSeparatorProps {
  class?: string;
}

export function ComboboxSeparator(props: ComboboxSeparatorProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="combobox-separator"
      class="${
        [separator, props.class]
      }"
    />
  ` as HellaNode;
}

interface ComboboxItemProps {
  value?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
  /** Selected state. A boolean reads statically; an accessor keeps the item reactive against its owning combobox. */
  selected?: boolean | (() => boolean);
  /** Highlighted state (the ref's data-highlighted ring); an accessor follows the active option. */
  highlighted?: boolean | (() => boolean);
  /** Hides the item (filtered out); a reactive accessor keeps it live against the query. */
  hidden?: () => boolean;
  /** Called on click when the item is enabled; the composed Combobox commits the selection. */
  onselect?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function ComboboxItem(props: ComboboxItemProps): HellaNode {
  const selected = (): boolean =>
    typeof props.selected === "function" ? props.selected() : props.selected ?? false;
  const highlighted = (): boolean =>
    typeof props.highlighted === "function" ? props.highlighted() : props.highlighted ?? false;
  // Precomputed so the style prop stays a bare reactive accessor (a compound
  // attribute expression would stringify through the transform).
  const hiddenStyle = props.hidden
    ? (): string => (props.hidden as () => boolean)() ? "display: none" : ""
    : undefined;
  return html`
    <div
      role="option"
      id="${props.id}"
      data-slot="combobox-item"
      data-value="${props.value}"
      aria-selected="${() => (selected() ? "true" : "false")}"
      data-state="${() => (selected() ? "checked" : "unchecked")}"
      data-highlighted="${() => (highlighted() ? "true" : undefined)}"
      data-disabled="${props.disabled ? "true" : undefined}"
      aria-disabled="${props.disabled ? "true" : undefined}"
      style="${hiddenStyle}"
      class="${
        [item, props.class]
      }"
      on:click="${() => {
        if (props.disabled) return;
        props.onselect?.();
      }}"
    >
      ${() => props.children ?? props.label}
      <span
        data-slot="combobox-item-indicator"
        class="${
          [itemIndicator]
        }"
      >
        ${() => (selected() ? checkIcon() : null)}
      </span>
    </div>
  ` as HellaNode;
}

interface ComboboxListProps {
  id?: string;
  /** Data-driven items; rendered once and hidden (never remounted) as the query filters them. */
  items?: ComboboxEntry[];
  /** Resolves the live query driving the filter. */
  query?: () => string;
  /** Replaces the default case-insensitive substring filter. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Resolves whether a value is selected (aria-selected, data-state, check icon). */
  selected?: (value: string) => boolean;
  /** Resolves the highlighted value (data-highlighted, the aria-activedescendant target). */
  active?: () => string | undefined;
  /** Called on item click with the item value; the composed Combobox commits the selection. */
  onselect?: (value: string) => void;
  /** Zero-match flag; drives data-empty styling. */
  empty?: () => boolean;
  children?: HellaChildren;
  class?: string;
}

export function ComboboxList(props: ComboboxListProps): HellaNode {
  const matches = (): ComboboxEntry[] => {
    const items = props.items ?? [];
    if (props.filter) return props.filter(items, props.query?.() ?? "");
    const q = (props.query?.() ?? "").trim().toLowerCase();
    if (q === "") return items;
    return items.filter((entry) => (entry.label ?? entry.value).toLowerCase().includes(q));
  };
  return html`
    <div
      role="listbox"
      id="${props.id}"
      data-slot="combobox-list"
      data-empty="${() => (props.empty?.() ? "" : undefined)}"
      class="${
        [list, props.class]
      }"
    >
      ${(props.items ?? []).map((entry) =>
        ComboboxItem({
          value: entry.value,
          label: entry.label,
          disabled: entry.disabled,
          id: (props.id ?? "") + "-opt-" + (props.items ?? []).indexOf(entry),
          selected: () => props.selected?.(entry.value) ?? false,
          highlighted: () => props.active?.() === entry.value,
          hidden: () => !matches().includes(entry),
          onselect: () => props.onselect?.(entry.value),
        }) as HellaChild,
      )}${() => props.children}
    </div>
  ` as HellaNode;
}

interface ComboboxInputProps {
  id?: string;
  value?: string | (() => string);
  placeholder?: string;
  disabled?: boolean;
  /** Query change callback (delegated input event, e.target.value). */
  onInput?: (value: string) => void;
  /** Keydown handler owning the combobox keyboard model. */
  onKeydown?: (e: KeyboardEvent) => void;
  /** Focus handler; the composed Combobox opens on focus. */
  onFocus?: () => void;
  /** Resolves open state for aria-expanded; the composed Combobox wires it. */
  state?: () => "open" | "closed";
  /** Id of the listbox the input controls; lands in aria-controls. */
  ariaControls?: string;
  /** Resolves the active option id for aria-activedescendant. */
  activeDescendant?: () => string | undefined;
  showTrigger?: boolean;
  showClear?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  hasValue?: () => boolean;
  /** Wires the wrapper on mount and returns its dispose; the composed Combobox anchors the panel here and attaches typeahead. */
  wire?: (node: HTMLElement) => () => void;
  /** The portaled panel, mounted while open; rendered as a reactive child inside the wrapper. */
  portal?: () => HellaChildren;
  children?: HellaChildren;
  class?: string;
}

export function ComboboxInput(props: ComboboxInputProps): HellaNode {
  const state = (): "open" | "closed" => props.state?.() ?? "closed";
  let disposeWire: (() => void) | undefined;
  return html`
    <div
      data-slot="input-group"
      role="group"
      data-disabled="${props.disabled ? "true" : undefined}"
      class="${
        [base, props.class]
      }"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) disposeWire = props.wire?.(node);
      }}"
      hook:beforeDestroy="${() => {
        disposeWire?.();
        disposeWire = undefined;
      }}"
    >
      <input
        type="text"
        role="combobox"
        data-slot="input-group-control"
        aria-autocomplete="list"
        aria-expanded="${() => (state() === "open" ? "true" : "false")}"
        aria-controls="${props.ariaControls}"
        aria-activedescendant="${() => props.activeDescendant?.()}"
        placeholder="${props.placeholder}"
        disabled="${props.disabled}"
        value="${props.value}"
        class="${
          [input, inputFocus, inputInvalid, inputControl]
        }"
        on:input="${(e: Event) => props.onInput?.((e.target as HTMLInputElement).value)}"
        on:keydown="${(e: Event) => props.onKeydown?.(e as KeyboardEvent)}"
        on:focus="${() => props.onFocus?.()}"
      />
      <div
        data-slot="input-group-addon"
        role="group"
        data-align="inline-end"
        class="${
          [addon]
        }"
        on:click="${(e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest("button")) return;
          target.closest('[data-slot="input-group"]')?.querySelector("input")?.focus();
        }}"
      >
        ${() => (props.showTrigger ? html`<button
          type="button"
          data-slot="combobox-trigger"
          aria-label="Toggle"
          disabled="${props.disabled}"
          class="${
            [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, triggerExtra]
          }"
          on:click="${() => props.onToggle?.()}"
        >${chevronDownIcon()}</button>` as HellaChild : null)}${() => (props.showClear ? html`<button
          type="button"
          data-slot="combobox-clear"
          aria-label="Clear"
          disabled="${props.disabled}"
          class="${
            [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs]
          }"
          on:click="${() => props.onClear?.()}"
        >${clearIcon()}</button>` as HellaChild : null)}
      </div>
      ${() => props.portal?.()}${() => props.children}
    </div>
  ` as HellaNode;
}

interface ComboboxChipsProps {
  children?: HellaChildren;
  /** Reactive chips; a thunk so the selected-values map stays a single reactive child (nested function children stringify). */
  chips?: () => HellaChildren;
  disabled?: boolean;
  /** Wires the chips wrapper on mount and returns its dispose; the composed Combobox anchors the panel here. */
  wire?: (node: HTMLElement) => () => void;
  /** The portaled panel, mounted while open; rendered as a reactive child inside the wrapper. */
  portal?: () => HellaChildren;
  class?: string;
}

export function ComboboxChips(props: ComboboxChipsProps): HellaNode {
  let disposeWire: (() => void) | undefined;
  return html`
    <div
      data-slot="combobox-chips"
      data-disabled="${props.disabled ? "true" : undefined}"
      class="${
        [chips, props.class]
      }"
      hook:afterMount="${(node: Element) => {
        if (node instanceof HTMLElement) disposeWire = props.wire?.(node);
      }}"
      hook:beforeDestroy="${() => {
        disposeWire?.();
        disposeWire = undefined;
      }}"
    >
      ${() => props.chips?.()}
      ${() => props.children}
      ${() => props.portal?.()}
    </div>
  ` as HellaNode;
}

interface ComboboxChipProps {
  value?: string;
  disabled?: boolean;
  /** Renders the remove button; defaults to true. */
  showRemove?: boolean;
  onRemove?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function ComboboxChip(props: ComboboxChipProps): HellaNode {
  return html`
    <div
      data-slot="combobox-chip"
      data-value="${props.value}"
      data-disabled="${props.disabled ? "true" : undefined}"
      class="${
        [chip, props.class]
      }"
    >
      ${() => props.children}${() => (props.showRemove !== false ? html`<button
        type="button"
        data-slot="combobox-chip-remove"
        aria-label="Remove"
        disabled="${props.disabled}"
        class="${
          [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, chipRemoveExtra]
        }"
        on:click="${() => props.onRemove?.()}"
      >${clearIcon()}</button>` as HellaChild : null)}
    </div>
  ` as HellaNode;
}

interface ComboboxChipsInputProps {
  id?: string;
  value?: string | (() => string);
  placeholder?: string;
  disabled?: boolean;
  onInput?: (value: string) => void;
  onKeydown?: (e: KeyboardEvent) => void;
  onFocus?: () => void;
  state?: () => "open" | "closed";
  ariaControls?: string;
  activeDescendant?: () => string | undefined;
  class?: string;
}

export function ComboboxChipsInput(props: ComboboxChipsInputProps): HellaNode {
  const state = (): "open" | "closed" => props.state?.() ?? "closed";
  return html`
    <input
      type="text"
      role="combobox"
      data-slot="combobox-chip-input"
      aria-autocomplete="list"
      aria-expanded="${() => (state() === "open" ? "true" : "false")}"
      aria-controls="${props.ariaControls}"
      aria-activedescendant="${() => props.activeDescendant?.()}"
      placeholder="${props.placeholder}"
      disabled="${props.disabled}"
      value="${props.value}"
      class="${
        [chipsInput, props.class]
      }"
      on:input="${(e: Event) => props.onInput?.((e.target as HTMLInputElement).value)}"
      on:keydown="${(e: Event) => props.onKeydown?.(e as KeyboardEvent)}"
      on:focus="${() => props.onFocus?.()}"
    />
  ` as HellaNode;
}

interface ComboboxContentProps {
  state?: () => "open" | "closed";
  id?: string;
  side?: AnchorSide;
  align?: AnchorAlign;
  /** Gap between the anchor and the content edge, in px. Default 6. */
  sideOffset?: number;
  /** Resolves the element the content anchors to (the input wrapper); positioning is skipped when undefined. */
  anchor?: () => Element | undefined;
  /** Sets data-chips="true" (chips-composition width styling). */
  chips?: boolean;
  /** Zero-match flag; drives data-empty styling. */
  empty?: () => boolean;
  /** When given, Escape and an outside pointerdown dismiss the top layer into this callback. */
  onDismiss?: () => void;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

export function ComboboxContent(props: ComboboxContentProps): HellaNode {
  const side = props.side ?? "bottom";
  const align = props.align ?? "start";
  const state = (): "open" | "closed" => props.state?.() ?? "open";
  const wirings: (() => void)[] = [];
  const teardown: (() => void)[] = [];

  const disposeWirings = (): void => {
    while (wirings.length) wirings.pop()!();
  };

  // The exit runs unwired: flipping to "closed" tears the layer down
  // immediately; reopening remounts fresh wirings with the content.
  effect(() => {
    if (state() === "closed") disposeWirings();
  });

  return html`
    <div
      data-slot="combobox-content"
      data-state="${() => state()}"
      data-side="${side}"
      data-align="${align}"
      data-chips="${props.chips ? "true" : undefined}"
      data-empty="${() => (props.empty?.() ? "" : undefined)}"
      class="${
        [content, props.class]
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        const anchorEl = props.anchor?.();
        if (anchorEl != null) wirings.push(anchorPosition(anchorEl, node, { placement: placementOf(side, align), offset: props.sideOffset ?? 6, matchAnchorWidth: true }));
        if (props.onDismiss) {
          wirings.push(layerDismissal(() => [node, anchorEl ?? null], props.onDismiss));
        }
        const onAnimationEnd = (): void => {
          if (state() === "closed") props.onExited?.();
        };
        node.addEventListener("animationend", onAnimationEnd);
        teardown.push(() => node.removeEventListener("animationend", onAnimationEnd));
      }}"
      hook:beforeDestroy="${() => {
        disposeWirings();
        while (teardown.length) teardown.pop()!();
      }}"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ComboboxProps {
  items?: ComboboxEntry[];
  /** Controlled selection. Single mode holds one value; multiple mode holds an array. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
  /** Replaces the default case-insensitive substring filter over item labels. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Renders the input's clear affordance while a value is selected. */
  showClear?: boolean;
  class?: string;
}

let comboboxCount = 0;

export default function Combobox(props: ComboboxProps): HellaNode {
  const s = comboboxOpenState();
  const listId = `hella-combobox-list-${++comboboxCount}`;
  const query = signal("");
  const internal = signal<string | string[]>(props.multiple ? [] : "");
  const current = (): string | string[] => (props.value !== undefined ? props.value() : internal());
  const selectedList = (): string[] => {
    const v = current();
    if (Array.isArray(v)) return v;
    return v !== "" && v !== undefined ? [v] : [];
  };
  const select = (next: string): void => {
    if (props.multiple) {
      const currentList = selectedList();
      const nextList = currentList.includes(next) ? currentList.filter((v) => v !== next) : [...currentList, next];
      if (props.value === undefined) internal(nextList);
      props.onValueChange?.(nextList);
      return;
    }
    if (props.value === undefined) internal(next);
    props.onValueChange?.(next);
  };
  const matches = (): ComboboxEntry[] => {
    const items = props.items ?? [];
    if (props.filter) return props.filter(items, query());
    const q = query().trim().toLowerCase();
    if (q === "") return items;
    return items.filter((entry) => (entry.label ?? entry.value).toLowerCase().includes(q));
  };
  // The active option is tracked by value, so highlight survives the
  // items staying mounted while the query hides and shows them.
  const activeValue = signal<string | undefined>(undefined);
  const optionIdOf = (value: string): string => {
    const at = (props.items ?? []).findIndex((entry) => entry.value === value);
    return listId + "-opt-" + at;
  };
  const move = (delta: number): void => {
    const enabled = matches().filter((entry) => !entry.disabled);
    if (enabled.length === 0) return;
    const at = enabled.findIndex((entry) => entry.value === activeValue());
    const next = at === -1 ? (delta === 1 ? 0 : enabled.length - 1) : (at + delta + enabled.length) % enabled.length;
    activeValue(enabled[next]!.value);
  };
  const openSelection = (): void => {
    const enabled = matches().filter((entry) => !entry.disabled);
    const selected = enabled.find((entry) => selectedList().includes(entry.value));
    activeValue(selected ? selected.value : enabled[0]?.value);
  };
  const setOpen = (next: boolean): void => {
    if (next && !s.isOpen()) openSelection();
    s.setOpen(next);
  };
  const commit = (value: string): void => {
    select(value);
    if (!props.multiple) {
      query("");
      setOpen(false);
    }
  };
  const onKeydown = (e: KeyboardEvent): void => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!s.isOpen()) {
        setOpen(true);
        return;
      }
      move(e.key === "ArrowDown" ? 1 : -1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const entry = matches().find((candidate) => candidate.value === activeValue());
      if (!entry || entry.disabled) return;
      commit(entry.value);
      return;
    }
    if (e.key === "Escape") {
      if (query() !== "") query("");
      setOpen(false);
    }
  };
  const inputProps = {
    value: () => query(),
    onInput: (v: string) => query(v),
    onKeydown,
    onFocus: () => setOpen(true),
    state: s.state,
    ariaControls: listId,
    activeDescendant: (): string | undefined =>
      s.isOpen() && activeValue() !== undefined ? optionIdOf(activeValue()!) : undefined,
  };
  const wire = (node: HTMLElement): (() => void) => {
    // Typeahead rides the wrapper (printable keystrokes bubble from the
    // input) and walks the visible options' stable ids.
    return menuTypeahead(node, () => {
      const entries: { node: HTMLElement; text: string }[] = [];
      const matched = matches();
      let i = 0;
      while (i < matched.length) {
        const el = document.getElementById(optionIdOf(matched[i]!.value));
        if (el) entries.push({ node: el, text: matched[i]!.label ?? matched[i]!.value });
        i++;
      }
      return entries;
    }, (record) => {
      const entry = (props.items ?? []).find((e) => optionIdOf(e.value) === record.node.id);
      if (entry) activeValue(entry.value);
    });
  };
  let wrapperNode: HTMLElement | undefined;
  const portal = (): HellaChild | null => s.visible() ? (Portal({
    to: "body",
    children: [
      ComboboxContent({
        state: s.state,
        chips: props.multiple,
        anchor: () => wrapperNode,
        empty: () => matches().length === 0,
        onDismiss: () => setOpen(false),
        onExited: s.finishExit,
        children: [
          ComboboxList({
            id: listId,
            items: props.items,
            query,
            filter: props.filter,
            selected: (v: string) => selectedList().includes(v),
            active: () => activeValue(),
            empty: () => matches().length === 0,
            onselect: (v: string) => commit(v),
            children: [
              ComboboxEmpty({ children: "No items found." }) as HellaChild,
            ],
          }) as HellaChild,
        ],
      }) as HellaChild,
    ],
  }) as HellaChild) : null;
  if (props.multiple) {
    return ComboboxChips({
      chips: () => selectedList().map((v) =>
        ComboboxChip({
          value: v,
          onRemove: () => select(v),
          children: (props.items ?? []).find((entry) => entry.value === v)?.label ?? v,
        }) as HellaChild,
      ),
      wire: (node: HTMLElement) => {
        wrapperNode = node;
        return wire(node);
      },
      portal,
      children: [
        ComboboxChipsInput(inputProps) as HellaChild,
      ],
    });
  }
  return ComboboxInput({
    ...inputProps,
    showTrigger: true,
    showClear: props.showClear,
    onToggle: () => setOpen(!s.isOpen()),
    onClear: () => {
      select("");
      query("");
    },
    hasValue: () => selectedList().length > 0,
    wire: (node: HTMLElement) => {
      wrapperNode = node;
      return wire(node);
    },
    portal,
  });
}

export { Combobox };
