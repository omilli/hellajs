import { ForEach } from "@hellajs/dom";
import { radioGroup } from "@hellajs/headless";
import type { RadioGroupProps } from "./radio-group-types.js";

// @hella:styles
declare const base: string;
declare const icon: string;
declare const indicator: string;
declare const item: string;
declare const row: string;
// @hella:end

/** The circle icon (refs/icons/circle.svg), created per call so reactive swaps never share nodes between clones. */
const circleIcon = (): JSX.Element => (
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
    class={
      // @hella:compose
      [icon]
      // @hella:end
    }
  >
    <circle cx="12" cy="12" r="10" />
  </svg>
);

export function RadioGroup({
  items,
  keyBy,
  value,
  onValueChange,
  orientation,
  name,
  class: cls,
  ...attrs
}: RadioGroupProps): JSX.Element {
  const { Root, Item, Indicator } = radioGroup({
    value,
    onValueChange,
    orientation,
    name: name as string | undefined,
  });

  return (
    <Root
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <ForEach
        each={items}
        use={(entry) => (
          <label
            key={keyBy ? entry.value : undefined}
            data-slot="radio-group-row"
            class={
              // @hella:compose
              [row]
              // @hella:end
            }
          >
            <Item
              value={entry.value}
              name={name as string | undefined}
              disabled={entry.disabled}
              class={
                // @hella:compose
                [item]
                // @hella:end
              }
            >
              <Indicator
                value={entry.value}
                class={
                  // @hella:compose
                  [indicator]
                  // @hella:end
                }
              >
                {circleIcon()}
              </Indicator>
            </Item>
            <span>{entry.label}</span>
          </label>
        )}
      />
    </Root>
  );
}
