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
import { cn } from "./cn.js";

/** Renders the selected value for compositions that show the selection outside the input. */
export function ComboboxValue({ value, class: cls, ...attrs }: ComboboxValueProps): JSX.Element {
  const { Value } = combobox();
  return (
    <Value
      value={value}
      class={
        cn(cls)
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
        cn("[&_svg:not([class*='size-'])]:size-4", cls)
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
          cn("pointer-events-none size-4 text-muted-foreground")
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
        cn("inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50", "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3", "flex items-center gap-2 text-sm shadow-none size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0", cls)
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
        cn(cls)
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
        cn("px-2 py-1.5 text-xs text-muted-foreground pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm", cls)
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
        cn(cls)
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
        cn("hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex", cls)
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
        cn("-mx-1 my-1 h-px bg-border", cls)
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
        cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_[data-slot=combobox-item-indicator]]:pointer-events-none [&_[data-slot=combobox-item-indicator]]:absolute [&_[data-slot=combobox-item-indicator]]:right-2 [&_[data-slot=combobox-item-indicator]]:flex [&_[data-slot=combobox-item-indicator]]:size-4 [&_[data-slot=combobox-item-indicator]]:items-center [&_[data-slot=combobox-item-indicator]]:justify-center [&_[data-slot=combobox-check-icon]]:pointer-events-none [&_[data-slot=combobox-check-icon]]:size-4", cls)
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
        cn("max-h-[min(calc(--spacing(96)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0 [&_[data-slot=combobox-item]]:relative [&_[data-slot=combobox-item]]:flex [&_[data-slot=combobox-item]]:w-full [&_[data-slot=combobox-item]]:cursor-default [&_[data-slot=combobox-item]]:items-center [&_[data-slot=combobox-item]]:gap-2 [&_[data-slot=combobox-item]]:rounded-sm [&_[data-slot=combobox-item]]:py-1.5 [&_[data-slot=combobox-item]]:pr-8 [&_[data-slot=combobox-item]]:pl-2 [&_[data-slot=combobox-item]]:text-sm [&_[data-slot=combobox-item]]:outline-hidden [&_[data-slot=combobox-item]]:select-none [&_[data-slot=combobox-item]]:data-highlighted:bg-accent [&_[data-slot=combobox-item]]:data-highlighted:text-accent-foreground [&_[data-slot=combobox-item]]:data-[disabled]:pointer-events-none [&_[data-slot=combobox-item]]:data-[disabled]:opacity-50 [&_[data-slot=combobox-item]_svg]:pointer-events-none [&_[data-slot=combobox-item]_svg]:shrink-0 [&_[data-slot=combobox-item]_svg:not([class*='size-'])]:size-4 [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:pointer-events-none [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:absolute [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:right-2 [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:flex [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:size-4 [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:items-center [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:justify-center [&_[data-slot=combobox-item]_[data-slot=combobox-check-icon]]:pointer-events-none [&_[data-slot=combobox-item]_[data-slot=combobox-check-icon]]:size-4", cls)
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
        cn(cls)
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
        cn("flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-[3px] has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1.5 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40 [&_[data-slot=combobox-chip]]:flex [&_[data-slot=combobox-chip]]:h-[calc(--spacing(5.5))] [&_[data-slot=combobox-chip]]:w-fit [&_[data-slot=combobox-chip]]:items-center [&_[data-slot=combobox-chip]]:justify-center [&_[data-slot=combobox-chip]]:gap-1 [&_[data-slot=combobox-chip]]:rounded-sm [&_[data-slot=combobox-chip]]:bg-muted [&_[data-slot=combobox-chip]]:px-1.5 [&_[data-slot=combobox-chip]]:text-xs [&_[data-slot=combobox-chip]]:font-medium [&_[data-slot=combobox-chip]]:whitespace-nowrap [&_[data-slot=combobox-chip]]:text-foreground [&_[data-slot=combobox-chip]]:has-disabled:pointer-events-none [&_[data-slot=combobox-chip]]:has-disabled:cursor-not-allowed [&_[data-slot=combobox-chip]]:has-disabled:opacity-50 [&_[data-slot=combobox-chip]]:has-data-[slot=combobox-chip-remove]:pr-0 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:inline-flex [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:size-6 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:items-center [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:justify-center [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:gap-2 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:rounded-[calc(var(--radius)-5px)] [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:p-0 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:text-sm [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:font-medium [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:whitespace-nowrap [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:transition-all [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:outline-none [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:shadow-none [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:-ml-1 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:opacity-50 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:hover:opacity-100 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:hover:bg-accent [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:hover:text-accent-foreground [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:dark:hover:bg-accent/50 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:focus-visible:border-ring [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:focus-visible:ring-[3px] [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:focus-visible:ring-ring/50 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:disabled:pointer-events-none [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:disabled:opacity-50 [&_[data-slot=combobox-chip-remove]_svg]:pointer-events-none [&_[data-slot=combobox-chip-remove]_svg]:shrink-0 [&_[data-slot=combobox-chip-remove]_svg:not([class*='size-'])]:size-3 [&>input]:min-w-16 [&>input]:flex-1 [&>input]:outline-none", cls)
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
        cn("flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0 [&_[data-slot=combobox-chip-remove]]:inline-flex [&_[data-slot=combobox-chip-remove]]:size-6 [&_[data-slot=combobox-chip-remove]]:items-center [&_[data-slot=combobox-chip-remove]]:justify-center [&_[data-slot=combobox-chip-remove]]:gap-2 [&_[data-slot=combobox-chip-remove]]:rounded-[calc(var(--radius)-5px)] [&_[data-slot=combobox-chip-remove]]:p-0 [&_[data-slot=combobox-chip-remove]]:text-sm [&_[data-slot=combobox-chip-remove]]:font-medium [&_[data-slot=combobox-chip-remove]]:whitespace-nowrap [&_[data-slot=combobox-chip-remove]]:transition-all [&_[data-slot=combobox-chip-remove]]:outline-none [&_[data-slot=combobox-chip-remove]]:shadow-none [&_[data-slot=combobox-chip-remove]]:-ml-1 [&_[data-slot=combobox-chip-remove]]:opacity-50 [&_[data-slot=combobox-chip-remove]]:hover:opacity-100 [&_[data-slot=combobox-chip-remove]]:hover:bg-accent [&_[data-slot=combobox-chip-remove]]:hover:text-accent-foreground [&_[data-slot=combobox-chip-remove]]:dark:hover:bg-accent/50 [&_[data-slot=combobox-chip-remove]]:focus-visible:border-ring [&_[data-slot=combobox-chip-remove]]:focus-visible:ring-[3px] [&_[data-slot=combobox-chip-remove]]:focus-visible:ring-ring/50 [&_[data-slot=combobox-chip-remove]]:disabled:pointer-events-none [&_[data-slot=combobox-chip-remove]]:disabled:opacity-50 [&_[data-slot=combobox-chip-remove]_svg]:pointer-events-none [&_[data-slot=combobox-chip-remove]_svg]:shrink-0 [&_[data-slot=combobox-chip-remove]_svg:not([class*='size-'])]:size-3", cls)
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
        cn("min-w-16 flex-1 outline-none", cls)
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
        cn("group/combobox-content relative max-h-96 w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", cls)
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
    <C.Input showClear={showClear} class={multiple ? ["flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-[3px] has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1.5 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40 [&_[data-slot=combobox-chip]]:flex [&_[data-slot=combobox-chip]]:h-[calc(--spacing(5.5))] [&_[data-slot=combobox-chip]]:w-fit [&_[data-slot=combobox-chip]]:items-center [&_[data-slot=combobox-chip]]:justify-center [&_[data-slot=combobox-chip]]:gap-1 [&_[data-slot=combobox-chip]]:rounded-sm [&_[data-slot=combobox-chip]]:bg-muted [&_[data-slot=combobox-chip]]:px-1.5 [&_[data-slot=combobox-chip]]:text-xs [&_[data-slot=combobox-chip]]:font-medium [&_[data-slot=combobox-chip]]:whitespace-nowrap [&_[data-slot=combobox-chip]]:text-foreground [&_[data-slot=combobox-chip]]:has-disabled:pointer-events-none [&_[data-slot=combobox-chip]]:has-disabled:cursor-not-allowed [&_[data-slot=combobox-chip]]:has-disabled:opacity-50 [&_[data-slot=combobox-chip]]:has-data-[slot=combobox-chip-remove]:pr-0 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:inline-flex [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:size-6 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:items-center [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:justify-center [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:gap-2 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:rounded-[calc(var(--radius)-5px)] [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:p-0 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:text-sm [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:font-medium [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:whitespace-nowrap [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:transition-all [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:outline-none [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:shadow-none [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:-ml-1 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:opacity-50 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:hover:opacity-100 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:hover:bg-accent [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:hover:text-accent-foreground [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:dark:hover:bg-accent/50 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:focus-visible:border-ring [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:focus-visible:ring-[3px] [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:focus-visible:ring-ring/50 [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:disabled:pointer-events-none [&_[data-slot=combobox-chip]_[data-slot=combobox-chip-remove]]:disabled:opacity-50 [&_[data-slot=combobox-chip-remove]_svg]:pointer-events-none [&_[data-slot=combobox-chip-remove]_svg]:shrink-0 [&_[data-slot=combobox-chip-remove]_svg:not([class*='size-'])]:size-3 [&>input]:min-w-16 [&>input]:flex-1 [&>input]:outline-none", cls] : ["group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30 h-9 min-w-0 has-[>textarea]:h-auto has-[>[data-align=inline-start]]:[&>input]:pl-2 has-[>[data-align=inline-end]]:[&>input]:pr-2 has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 [&>input]:h-9 [&>input]:w-full [&>input]:min-w-0 [&>input]:flex-1 [&>input]:rounded-none [&>input]:border-0 [&>input]:bg-transparent [&>input]:px-3 [&>input]:py-1 [&>input]:text-base [&>input]:shadow-none [&>input]:transition-[color,box-shadow] [&>input]:outline-none [&>input]:selection:bg-primary [&>input]:selection:text-primary-foreground [&>input]:file:inline-flex [&>input]:file:h-7 [&>input]:file:border-0 [&>input]:file:bg-transparent [&>input]:file:text-sm [&>input]:file:font-medium [&>input]:file:text-foreground [&>input]:placeholder:text-muted-foreground [&>input]:disabled:pointer-events-none [&>input]:disabled:cursor-not-allowed [&>input]:disabled:opacity-50 [&>input]:md:text-sm [&>input]:dark:bg-transparent [&>input]:focus-visible:border-ring [&>input]:focus-visible:ring-0 [&>input]:aria-invalid:border-destructive [&>input]:aria-invalid:ring-destructive/20 [&>input]:dark:aria-invalid:ring-destructive/40 [&>[data-slot=input-group-addon]]:flex [&>[data-slot=input-group-addon]]:h-auto [&>[data-slot=input-group-addon]]:cursor-text [&>[data-slot=input-group-addon]]:items-center [&>[data-slot=input-group-addon]]:justify-center [&>[data-slot=input-group-addon]]:gap-2 [&>[data-slot=input-group-addon]]:py-1.5 [&>[data-slot=input-group-addon]]:text-sm [&>[data-slot=input-group-addon]]:font-medium [&>[data-slot=input-group-addon]]:text-muted-foreground [&>[data-slot=input-group-addon]]:select-none [&>[data-slot=input-group-addon]]:order-last [&>[data-slot=input-group-addon]]:pr-3 [&>[data-slot=input-group-addon]>kbd]:rounded-[calc(var(--radius)-5px)] [&>[data-slot=input-group-addon]>svg:not([class*='size-'])]:size-4 [&[data-disabled=true]>[data-slot=input-group-addon]]:opacity-50 [&_[data-slot=combobox-trigger]]:inline-flex [&_[data-slot=combobox-trigger]]:size-6 [&_[data-slot=combobox-trigger]]:items-center [&_[data-slot=combobox-trigger]]:justify-center [&_[data-slot=combobox-trigger]]:gap-2 [&_[data-slot=combobox-trigger]]:rounded-[calc(var(--radius)-5px)] [&_[data-slot=combobox-trigger]]:p-0 [&_[data-slot=combobox-trigger]]:text-sm [&_[data-slot=combobox-trigger]]:font-medium [&_[data-slot=combobox-trigger]]:whitespace-nowrap [&_[data-slot=combobox-trigger]]:transition-all [&_[data-slot=combobox-trigger]]:outline-none [&_[data-slot=combobox-trigger]]:shadow-none [&_[data-slot=combobox-trigger]]:hover:bg-accent [&_[data-slot=combobox-trigger]]:hover:text-accent-foreground [&_[data-slot=combobox-trigger]]:dark:hover:bg-accent/50 [&_[data-slot=combobox-trigger]]:focus-visible:border-ring [&_[data-slot=combobox-trigger]]:focus-visible:ring-[3px] [&_[data-slot=combobox-trigger]]:focus-visible:ring-ring/50 [&_[data-slot=combobox-trigger]]:disabled:pointer-events-none [&_[data-slot=combobox-trigger]]:disabled:opacity-50 [&_[data-slot=combobox-trigger]]:data-pressed:bg-transparent [&_[data-slot=combobox-trigger]_svg]:pointer-events-none [&_[data-slot=combobox-trigger]_svg]:shrink-0 [&_[data-slot=combobox-trigger]_svg:not([class*='size-'])]:size-3 [&_[data-slot=combobox-clear]]:inline-flex [&_[data-slot=combobox-clear]]:size-6 [&_[data-slot=combobox-clear]]:items-center [&_[data-slot=combobox-clear]]:justify-center [&_[data-slot=combobox-clear]]:gap-2 [&_[data-slot=combobox-clear]]:rounded-[calc(var(--radius)-5px)] [&_[data-slot=combobox-clear]]:p-0 [&_[data-slot=combobox-clear]]:text-sm [&_[data-slot=combobox-clear]]:font-medium [&_[data-slot=combobox-clear]]:whitespace-nowrap [&_[data-slot=combobox-clear]]:transition-all [&_[data-slot=combobox-clear]]:outline-none [&_[data-slot=combobox-clear]]:shadow-none [&_[data-slot=combobox-clear]]:hover:bg-accent [&_[data-slot=combobox-clear]]:hover:text-accent-foreground [&_[data-slot=combobox-clear]]:dark:hover:bg-accent/50 [&_[data-slot=combobox-clear]]:focus-visible:border-ring [&_[data-slot=combobox-clear]]:focus-visible:ring-[3px] [&_[data-slot=combobox-clear]]:focus-visible:ring-ring/50 [&_[data-slot=combobox-clear]]:disabled:pointer-events-none [&_[data-slot=combobox-clear]]:disabled:opacity-50 [&_[data-slot=combobox-clear]_svg]:pointer-events-none [&_[data-slot=combobox-clear]_svg]:shrink-0 [&_[data-slot=combobox-clear]_svg:not([class*='size-'])]:size-3 [&_[data-slot=combobox-trigger-icon]]:pointer-events-none [&_[data-slot=combobox-trigger-icon]]:size-4 [&_[data-slot=combobox-trigger-icon]]:text-muted-foreground [&_[data-slot=combobox-clear-icon]]:pointer-events-none [&:has([data-slot=combobox-clear])_[data-slot=combobox-trigger]]:hidden", cls]} {...attrs}>
      <C.Content
        class={
          cn("group/combobox-content relative max-h-96 w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95")
        }
      >
        <C.List
          items={items}
          keyBy={keyBy}
          class={
            cn("max-h-[min(calc(--spacing(96)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0 [&_[data-slot=combobox-item]]:relative [&_[data-slot=combobox-item]]:flex [&_[data-slot=combobox-item]]:w-full [&_[data-slot=combobox-item]]:cursor-default [&_[data-slot=combobox-item]]:items-center [&_[data-slot=combobox-item]]:gap-2 [&_[data-slot=combobox-item]]:rounded-sm [&_[data-slot=combobox-item]]:py-1.5 [&_[data-slot=combobox-item]]:pr-8 [&_[data-slot=combobox-item]]:pl-2 [&_[data-slot=combobox-item]]:text-sm [&_[data-slot=combobox-item]]:outline-hidden [&_[data-slot=combobox-item]]:select-none [&_[data-slot=combobox-item]]:data-highlighted:bg-accent [&_[data-slot=combobox-item]]:data-highlighted:text-accent-foreground [&_[data-slot=combobox-item]]:data-[disabled]:pointer-events-none [&_[data-slot=combobox-item]]:data-[disabled]:opacity-50 [&_[data-slot=combobox-item]_svg]:pointer-events-none [&_[data-slot=combobox-item]_svg]:shrink-0 [&_[data-slot=combobox-item]_svg:not([class*='size-'])]:size-4 [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:pointer-events-none [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:absolute [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:right-2 [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:flex [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:size-4 [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:items-center [&_[data-slot=combobox-item]_[data-slot=combobox-item-indicator]]:justify-center [&_[data-slot=combobox-item]_[data-slot=combobox-check-icon]]:pointer-events-none [&_[data-slot=combobox-item]_[data-slot=combobox-check-icon]]:size-4")
          }
        >
          <C.Empty
            class={
              cn("hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex")
            }
          >
            No items found.
          </C.Empty>
        </C.List>
      </C.Content>
    </C.Input>
  );
}
