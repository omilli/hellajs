import { signal } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import { select } from "@hellajs/headless";
import type { SelectEntry, SelectProps } from "./select-types.js";

// @hella:styles
declare const base: string;
declare const content: string;
declare const item: string;
// @hella:end

export function Select({
  items,
  keyBy,
  value,
  onValueChange,
  placeholder,
  size,
  clearable,
  class: cls,
  ...attrs
}: SelectProps): JSX.Element {
  const internal = signal("");
  const current = (): string => (value !== undefined ? value() : internal());
  const S = select({
    value,
    onValueChange: (next) => {
      if (value === undefined) internal(next);
      onValueChange?.(next);
    },
  });
  const resolveItems = (): SelectEntry[] =>
    typeof items === "function" ? (items as () => SelectEntry[])() : (items ?? []);
  const currentLabel = (): HellaChildren | undefined =>
    resolveItems().find((entry) => entry.value === current())?.label;
  return (
    <S.Trigger
      size={size}
      clearable={clearable}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <S.Value placeholder={placeholder} value={currentLabel} />
      <S.Content
        class={
          // @hella:compose
          [content]
          // @hella:end
        }
      >
        <ForEach
          each={resolveItems}
          use={(entry) => (
            <S.Item
              key={keyBy ? entry.value : undefined}
              value={entry.value}
              label={entry.label}
              disabled={entry.disabled}
              class={
                // @hella:compose
                [item]
                // @hella:end
              }
            />
          )}
        />
      </S.Content>
    </S.Trigger>
  );
}
