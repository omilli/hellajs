import { combobox } from "@hellajs/headless";
import type { ComboboxProps } from "./combobox-types.js";

// @hella:styles
declare const base: string;
declare const chips: string;
declare const content: string;
declare const empty: string;
declare const list: string;
// @hella:end

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
