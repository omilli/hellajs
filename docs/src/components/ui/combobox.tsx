import { combobox } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

type AnchorSide = "top" | "bottom" | "left" | "right";

type AnchorAlign = "start" | "center" | "end";

interface ComboboxEntry {
  value: string;
  label?: string;
  disabled?: boolean;
}

interface ComboboxValueProps extends HTMLAttributes<"span"> {
  /** The displayed selection. A string reads statically; an accessor keeps it reactive; an array joins with ", ". */
  value?: string | string[] | (() => string | string[] | undefined);
  class?: string;
}

interface ComboboxTriggerProps extends HTMLAttributes<"button"> {
  children?: HellaChildren;
  class?: string;
}

interface ComboboxClearProps extends HTMLAttributes<"button"> {
  /** Called on click; the composed Combobox wipes the selection. */
  onClear?: () => void;
  class?: string;
}

interface ComboboxGroupProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface ComboboxLabelProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface ComboboxCollectionProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface ComboboxEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface ComboboxSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

interface ComboboxItemProps extends HTMLAttributes<"div"> {
  value?: string;
  label?: string;
  disabled?: boolean;
  id?: string;
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

interface ComboboxListProps extends HTMLAttributes<"div"> {
  /** The listbox id; option ids derive as `<id>-opt-<value>`. */
  id?: string;
  /** Data-driven items; a plain array reads once at mount, an accessor re-renders the list as it changes. The query keeps rows mounted and toggles their visibility. */
  items?: ComboboxEntry[] | (() => ComboboxEntry[]);
  /** Reuses item DOM through reorders by `value` identity (selection and highlight state survive); order always follows the array. */
  keyBy?: "value";
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

interface ComboboxInputProps extends HTMLAttributes<"input"> {
  value?: string | (() => string);
  disabled?: boolean;
  /** Resolves open state for aria-expanded; the composed Combobox wires it. */
  state?: () => "open" | "closed";
  /** Resolves the active option id for aria-activedescendant. */
  activeDescendant?: () => string | undefined;
  showTrigger?: boolean;
  showClear?: boolean;
  onToggle?: () => void;
  onClear?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface ComboboxChipsProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  /** Reactive chips; a thunk so the selected-values map stays a single reactive child (nested function children stringify). */
  chips?: () => HellaChildren;
  /** Wired, not spread: renders data-disabled and gates the chip remove buttons. */
  disabled?: boolean;
  class?: string;
}

interface ComboboxChipProps extends HTMLAttributes<"div"> {
  value?: string;
  /** Wired, not spread: renders data-disabled and gates the remove button. */
  disabled?: boolean;
  /** Renders the remove button; defaults to true. */
  showRemove?: boolean;
  onRemove?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface ComboboxChipsInputProps extends HTMLAttributes<"input"> {
  value?: string | (() => string);
  disabled?: boolean;
  /** Resolves open state for aria-expanded; the composed Combobox wires it. */
  state?: () => "open" | "closed";
  /** Resolves the active option id for aria-activedescendant. */
  activeDescendant?: () => string | undefined;
  class?: string;
}

interface ComboboxContentProps extends HTMLAttributes<"div"> {
  id?: string;
  state?: () => "open" | "closed";
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

interface ComboboxProps extends HTMLAttributes<"div"> {
  items?: ComboboxEntry[] | (() => ComboboxEntry[]);
  /** Reuses option DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selection. Single mode holds one value; multiple mode holds an array. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  /** Replaces the default case-insensitive substring filter over item labels. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Renders the input's clear affordance while a value is selected. */
  showClear?: boolean;
  class?: string;
}

import { css, keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({
  from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" },
});
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

// The headless factory renders the addon's toggle/clear buttons, the chips
// rows, and the option rows classless; these merged rule blocks restyle them
// through their data-slots from the wrapper roots (base, chips, list) and are
// shared with the manually composed parts that root the same rules directly.
const addonButtonRules = {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} - 5px)`,
  boxSizing: "border-box",
  display: "flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  height: "1.5rem",
  width: "1.5rem",
  padding: "0",
  boxShadow: "none",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "0.75rem",
    width: "0.75rem",
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *):hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-pressed]": {
    backgroundColor: "transparent",
  },
};

const clearButtonRules = {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} - 5px)`,
  boxSizing: "border-box",
  display: "flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  height: "1.5rem",
  width: "1.5rem",
  padding: "0",
  boxShadow: "none",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "0.75rem",
    width: "0.75rem",
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *):hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
};

const itemRules = {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
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
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
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
  "& [data-slot='combobox-item-indicator']": {
    alignItems: "center",
    display: "flex",
    height: "1rem",
    justifyContent: "center",
    pointerEvents: "none",
    position: "absolute",
    right: "0.5rem",
    width: "1rem",
  },
  "& [data-slot='combobox-check-icon']": {
    height: "1rem",
    pointerEvents: "none",
    width: "1rem",
    "@media (pointer: coarse)": {
      "&": {
        height: "1.25rem",
        width: "1.25rem",
      },
    },
  },
};

// The factory-rendered input element: the cascade of the old per-element
// input/inputFocus/inputInvalid/inputControl classes, merged onto one node.
const inputRules = {
  background: "transparent",
  border: `1px solid ${tokens.input}`,
  borderRadius: "0",
  borderWidth: "0",
  boxShadow: "none",
  fontSize: "1rem",
  flex: "1 1 0%",
  height: "2.25rem",
  lineHeight: "1.5rem",
  minWidth: "0",
  outlineStyle: "none",
  paddingBlock: "0.25rem",
  paddingInline: "0.75rem",
  transition:
    "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&::file-selector-button": {
    background: "transparent",
    border: "none",
    color: tokens.foreground,
    display: "inline-flex",
    fontSize: "0.875rem",
    fontWeight: "500",
    height: "1.75rem",
  },
  "&::placeholder": {
    color: tokens.mutedForeground,
  },
  "&::selection": {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
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
    background: "transparent",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
};

const chipRules = {
  alignItems: "center",
  backgroundColor: tokens.muted,
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  color: tokens.foreground,
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
  "& [data-slot='combobox-chip-remove']": {
    ...clearButtonRules,
    marginLeft: "-0.25rem",
    opacity: "0.5",
    "&:hover": {
      opacity: "1",
    },
  },
};

const base = style("combobox-wrapper", {
  alignItems: "center",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  height: "2.25rem",
  minWidth: "0",
  outlineStyle: "none",
  position: "relative",
  transition:
    "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&:is(.dark *)": {
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
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
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:has([data-slot][aria-invalid='true'])": {
    borderColor: tokens.destructive,
  },
  "&:has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *):has([data-slot][aria-invalid='true']):has([data-slot='input-group-control']:focus-visible)":
    {
      boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
    },
  "& > input": inputRules,
  "& > [data-slot='input-group-addon']": {
    alignItems: "center",
    color: tokens.mutedForeground,
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
      borderRadius: `calc(${tokens.radius} - 5px)`,
    },
    "& > svg:not([class*='size-'])": {
      height: "1rem",
      width: "1rem",
    },
    "&[data-disabled='true']": {
      opacity: "0.5",
    },
    "& > [data-slot='combobox-trigger']": addonButtonRules,
    "& > [data-slot='combobox-clear']": clearButtonRules,
    "& [data-slot='combobox-trigger-icon']": {
      color: tokens.mutedForeground,
      height: "1rem",
      pointerEvents: "none",
      width: "1rem",
    },
    "& [data-slot='combobox-clear-icon']": {
      pointerEvents: "none",
    },
  },
});

const buttonBase = style("combobox-button", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

const buttonGhost = style("combobox-button-ghost", {
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:is(.dark *):hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
  },
});

const buttonSizeIconXs = style("combobox-button-size-icon-xs", {
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  height: "1.5rem",
  width: "1.5rem",
  "& svg:not([class*='size-'])": {
    height: "0.75rem",
    width: "0.75rem",
  },
});

const sizeIconXs = style("combobox-size-icon-xs", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} - 5px)`,
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  height: "1.5rem",
  padding: "0",
  boxShadow: "none",
  "&:has(> svg)": {
    padding: "0",
  },
});

const trigger = style("combobox-trigger", {
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
});

const triggerIcon = style("combobox-trigger-icon", {
  color: tokens.mutedForeground,
  height: "1rem",
  pointerEvents: "none",
  width: "1rem",
});

const content = style("combobox-content", {
  backgroundColor: tokens.popover,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1), 0 0 0 1px color-mix(in oklab, ${tokens.foreground} 10%, transparent)`,
  color: tokens.popoverForeground,
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
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
    borderColor: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
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
});

const list = style("combobox-list", {
  maxHeight: "min(calc(24rem - 2.25rem), calc(var(--available-height) - 2.25rem))",
  overflowY: "auto",
  padding: "0.25rem",
  scrollPaddingBlock: "0.25rem",
  "&[data-empty]": {
    padding: "0",
  },
  "& [data-slot='combobox-item']": itemRules,
});

const item = style("combobox-item", itemRules);

const label = style("combobox-label", {
  color: tokens.mutedForeground,
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
});

const empty = style("combobox-empty", {
  color: tokens.mutedForeground,
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
});

const separator = style("combobox-separator", {
  backgroundColor: tokens.border,
  height: "1px",
  marginBlock: "0.25rem",
  marginInline: "-0.25rem",
});

const chips = style("combobox-chips", {
  alignItems: "center",
  backgroundClip: "padding-box",
  backgroundColor: "transparent",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  flexWrap: "wrap",
  fontSize: "0.875rem",
  gap: "0.375rem",
  lineHeight: "1.25rem",
  minHeight: "2.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.625rem",
  transition:
    "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:focus-within": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:has([aria-invalid='true'])": {
    borderColor: tokens.destructive,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:has([data-slot='combobox-chip'])": {
    paddingInline: "0.375rem",
  },
  "&:is(.dark *)": {
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:is(.dark *):has([aria-invalid='true'])": {
    borderColor: `color-mix(in oklab, ${tokens.destructive} 50%, transparent)`,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
  "& [data-slot='combobox-chip']": chipRules,
  "& > input": {
    flex: "1 1 0%",
    minWidth: "4rem",
    outlineStyle: "none",
  },
});

const chip = style("combobox-chip", chipRules);

const chipsInput = style("combobox-chips-input", {
  flex: "1 1 0%",
  minWidth: "4rem",
  outlineStyle: "none",
});

css({
  "[data-slot='input-group']:has([data-slot='combobox-clear']) [data-slot='combobox-trigger']": {
    display: "none",
  },
});

/** Renders the selected value for compositions that show the selection outside the input. */
export function ComboboxValue({ value, class: cls, ...attrs }: ComboboxValueProps): JSX.Element {
  const { Value } = combobox();
  return (
    <Value
      value={value}
      class={
        [cls]
      }
      {...attrs}
    />
  );
}

/** The manual trigger button; the composed Combobox renders its chevron twin inside the input-group addon. */
export function ComboboxTrigger({
  children,
  class: cls,
  ...attrs
}: ComboboxTriggerProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="combobox-trigger"
      class={
        [trigger, cls]
      }
      {...attrs}
    >
      {children}
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
        data-slot="combobox-trigger-icon"
        class={
          [triggerIcon]
        }
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </button>
  );
}

/** The clear affordance, styled as the input-group's ghost icon-xs button. */
export function ComboboxClear({
  onClear,
  "on:click": userClick,
  class: cls,
  ...attrs
}: ComboboxClearProps): JSX.Element {
  const { Clear } = combobox();
  return (
    <Clear
      onClear={onClear}
      on:click={userClick}
      class={
        [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, cls]
      }
      {...attrs}
    />
  );
}

export function ComboboxGroup({ children, class: cls, ...attrs }: ComboboxGroupProps): JSX.Element {
  const { Group } = combobox();
  return (
    <Group
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function ComboboxLabel({ children, class: cls, ...attrs }: ComboboxLabelProps): JSX.Element {
  const { Label } = combobox();
  return (
    <Label
      class={
        [label, cls]
      }
      {...attrs}
    >
      {children}
    </Label>
  );
}

/** Passthrough wrapper grouping items rendered from external data. */
export function ComboboxCollection({
  children,
  class: cls,
  ...attrs
}: ComboboxCollectionProps): JSX.Element {
  const { Collection } = combobox();
  return (
    <Collection
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Collection>
  );
}

/** Renders when the query matches nothing; the composed Combobox mounts it with its default text. */
export function ComboboxEmpty({ children, class: cls, ...attrs }: ComboboxEmptyProps): JSX.Element {
  const { Empty } = combobox();
  return (
    <Empty
      class={
        [empty, cls]
      }
      {...attrs}
    >
      {children}
    </Empty>
  );
}

export function ComboboxSeparator({ class: cls, ...attrs }: ComboboxSeparatorProps): JSX.Element {
  const { Separator } = combobox();
  return (
    <Separator
      class={
        [separator, cls]
      }
      {...attrs}
    />
  );
}

export function ComboboxItem({
  value,
  label: labelProp,
  disabled,
  selected: selectedProp,
  highlighted: highlightedProp,
  hidden,
  onselect,
  "on:click": userClick,
  children,
  class: cls,
  ...attrs
}: ComboboxItemProps): JSX.Element {
  const { Item } = combobox();
  return (
    <Item
      value={value}
      label={labelProp}
      disabled={disabled}
      selected={selectedProp}
      highlighted={highlightedProp}
      hidden={hidden}
      onselect={onselect}
      on:click={userClick}
      class={
        [item, cls]
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function ComboboxList({
  id,
  items: itemsProp,
  keyBy,
  query,
  filter,
  selected,
  active,
  onselect,
  empty: emptyProp,
  children,
  class: cls,
  ...attrs
}: ComboboxListProps): JSX.Element {
  const { List } = combobox();
  return (
    <List
      id={id}
      items={itemsProp}
      keyBy={keyBy}
      query={query}
      filter={filter}
      selected={selected}
      active={active}
      onselect={onselect}
      empty={emptyProp}
      class={
        [list, cls]
      }
      {...attrs}
    >
      {children}
    </List>
  );
}

export function ComboboxInput({
  value,
  disabled,
  state: stateProp,
  activeDescendant,
  showTrigger,
  showClear,
  onToggle,
  onClear,
  children,
  class: cls,
  ...attrs
}: ComboboxInputProps): JSX.Element {
  const { Input } = combobox();
  return (
    <Input
      value={value}
      disabled={disabled}
      state={stateProp}
      activeDescendant={activeDescendant}
      showTrigger={showTrigger}
      showClear={showClear}
      onToggle={onToggle}
      onClear={onClear}
      class={
        [cls]
      }
      {...attrs}
    >
      {children}
    </Input>
  );
}

export function ComboboxChips({
  children,
  chips: chipsSlot,
  disabled,
  class: cls,
  ...attrs
}: ComboboxChipsProps): JSX.Element {
  const { Chips } = combobox();
  return (
    <Chips
      chips={chipsSlot}
      disabled={disabled}
      class={
        [chips, cls]
      }
      {...attrs}
    >
      {children}
    </Chips>
  );
}

export function ComboboxChip({
  value,
  disabled,
  showRemove,
  onRemove,
  children,
  class: cls,
  ...attrs
}: ComboboxChipProps): JSX.Element {
  const { Chip } = combobox();
  return (
    <Chip
      value={value}
      disabled={disabled}
      showRemove={showRemove}
      onRemove={onRemove}
      class={
        [chip, cls]
      }
      {...attrs}
    >
      {children}
    </Chip>
  );
}

export function ComboboxChipsInput({
  value,
  disabled,
  state: stateProp,
  activeDescendant,
  class: cls,
  ...attrs
}: ComboboxChipsInputProps): JSX.Element {
  const { ChipsInput } = combobox();
  return (
    <ChipsInput
      value={value}
      disabled={disabled}
      state={stateProp}
      activeDescendant={activeDescendant}
      class={
        [chipsInput, cls]
      }
      {...attrs}
    />
  );
}

export function ComboboxContent({
  state: stateProp,
  side: sideProp,
  align: alignProp,
  sideOffset,
  anchor,
  chips: chipsProp,
  empty: emptyProp,
  onDismiss,
  onExited,
  children,
  class: cls,
  ...attrs
}: ComboboxContentProps): JSX.Element {
  const { Content } = combobox({
    open: () => (stateProp?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onDismiss?.();
    },
  });
  return (
    <Content
      side={sideProp}
      align={alignProp}
      sideOffset={sideOffset}
      anchor={anchor}
      chips={chipsProp}
      empty={emptyProp}
      onExited={onExited}
      class={
        [content, cls]
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

export function Combobox({
  items,
  keyBy,
  value,
  onValueChange,
  multiple,
  filter,
  showClear,
  class: cls,
  ...attrs
}: ComboboxProps): JSX.Element {
  const C = combobox({ items, value, onValueChange, multiple, filter });
  return (
    <C.Input showClear={showClear} class={multiple ? [chips, cls] : [base, cls]} {...attrs}>
      <C.Content
        class={
          [content]
        }
      >
        <C.List
          items={items}
          keyBy={keyBy}
          class={
            [list]
          }
        >
          <C.Empty
            class={
              [empty]
            }
          >
            No items found.
          </C.Empty>
        </C.List>
      </C.Content>
    </C.Input>
  );
}
