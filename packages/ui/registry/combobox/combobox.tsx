import { combobox } from "@hellajs/headless";
import type {
  ComboboxValueProps,
  ComboboxTriggerProps,
  ComboboxClearProps,
  ComboboxGroupProps,
  ComboboxLabelProps,
  ComboboxCollectionProps,
  ComboboxEmptyProps,
  ComboboxSeparatorProps,
  ComboboxItemProps,
  ComboboxListProps,
  ComboboxInputProps,
  ComboboxChipsProps,
  ComboboxChipProps,
  ComboboxChipsInputProps,
  ComboboxContentProps,
  ComboboxProps,
} from "./combobox-types.js";

// @hella:styles
declare const base: string;
declare const buttonBase: string;
declare const buttonGhost: string;
declare const buttonSizeIconXs: string;
declare const chip: string;
declare const chips: string;
declare const chipsInput: string;
declare const content: string;
declare const empty: string;
declare const item: string;
declare const label: string;
declare const list: string;
declare const separator: string;
declare const sizeIconXs: string;
declare const trigger: string;
declare const triggerIcon: string;
// @hella:end

/** Renders the selected value for compositions that show the selection outside the input. */
export function ComboboxValue({ value, class: cls, ...attrs }: ComboboxValueProps): JSX.Element {
  const { Value } = combobox();
  return (
    <Value
      value={value}
      class={
        // @hella:compose
        [cls]
        // @hella:end
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
        // @hella:compose
        [trigger, cls]
        // @hella:end
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
          // @hella:compose
          [triggerIcon]
          // @hella:end
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
        // @hella:compose
        [buttonBase, buttonGhost, buttonSizeIconXs, sizeIconXs, cls]
        // @hella:end
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
        // @hella:compose
        [cls]
        // @hella:end
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
        // @hella:compose
        [label, cls]
        // @hella:end
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
        // @hella:compose
        [cls]
        // @hella:end
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
        // @hella:compose
        [empty, cls]
        // @hella:end
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
        // @hella:compose
        [separator, cls]
        // @hella:end
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
        // @hella:compose
        [item, cls]
        // @hella:end
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
        // @hella:compose
        [list, cls]
        // @hella:end
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
        // @hella:compose
        [cls]
        // @hella:end
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
        // @hella:compose
        [chips, cls]
        // @hella:end
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
        // @hella:compose
        [chip, cls]
        // @hella:end
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
        // @hella:compose
        [chipsInput, cls]
        // @hella:end
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
        // @hella:compose
        [content, cls]
        // @hella:end
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
          // @hella:compose
          [content]
          // @hella:end
        }
      >
        <C.List
          items={items}
          keyBy={keyBy}
          class={
            // @hella:compose
            [list]
            // @hella:end
          }
        >
          <C.Empty
            class={
              // @hella:compose
              [empty]
              // @hella:end
            }
          >
            No items found.
          </C.Empty>
        </C.List>
      </C.Content>
    </C.Input>
  );
}
