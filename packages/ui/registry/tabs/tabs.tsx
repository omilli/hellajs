import { ForEach } from "@hellajs/dom";
import { tabs } from "@hellajs/headless";
import type { TabsItem, TabsProps } from "./tabs-types.js";

export type { TabsItem };

// @hella:styles
declare const base: string;
declare const content: string;
declare const list: string;
declare const trigger: string;
declare const variants: Record<string, string>;
// @hella:end

export function Tabs({
  items,
  initialId,
  value,
  onValueChange,
  orientation = "horizontal",
  variant = "default",
  class: cls,
  ...attrs
}: TabsProps): JSX.Element {
  const { List, Trigger, Content } = tabs({
    orientation,
    value,
    onValueChange,
    defaultValue: initialId ?? (typeof items === "function" ? items()[0] : items[0])!.id,
  });

  return (
    <div
      data-slot="tabs"
      data-orientation={orientation}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <List
        data-variant={variant}
        class={
          // @hella:compose
          [list, variants[variant]]
          // @hella:end
        }
      >
        <ForEach
          each={items}
          use={(item) => (
            <Trigger
              value={item.id}
              data-variant={variant}
              class={
                // @hella:compose
                [trigger]
                // @hella:end
              }
            >
              {item.label}
            </Trigger>
          )}
        />
      </List>
      <ForEach each={items} use={(item) => <Content value={item.id}>{item.content}</Content>} />
    </div>
  );
}
