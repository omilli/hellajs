import { ForEach } from "@hellajs/dom";
import { tabs } from "@hellajs/headless";
import type {
  TabsItem,
  TabsProps,
  TabsListProps,
  TabsTriggerProps,
  TabsContentProps,
} from "./tabs-types.js";

export type { TabsItem };

// @hella:styles
declare const base: string;
declare const content: string;
declare const list: string;
declare const trigger: string;
declare const variants: Record<string, string>;
// @hella:end

export function TabsList({
  variant = "default",
  orientation = "horizontal",
  children,
  class: cls,
  ...attrs
}: TabsListProps): JSX.Element {
  const { List } = tabs({ orientation });
  return (
    <List
      data-variant={variant}
      class={
        // @hella:compose
        [list, variants[variant], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </List>
  );
}

export function TabsTrigger({
  id,
  value,
  active,
  onActivate,
  orientation = "horizontal",
  listVariant = "default",
  children,
  class: cls,
  ...attrs
}: TabsTriggerProps): JSX.Element {
  const { Trigger } = tabs({ orientation });
  return (
    <Trigger
      value={value ?? id}
      active={active}
      onActivate={onActivate}
      data-variant={listVariant}
      class={
        // @hella:compose
        [trigger, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

export function TabsContent({
  id,
  value,
  active,
  children,
  class: cls,
  ...attrs
}: TabsContentProps): JSX.Element {
  const { Content } = tabs();
  return (
    <Content
      value={value ?? id}
      active={active}
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

export function Tabs({
  items,
  initialId,
  orientation = "horizontal",
  variant = "default",
  class: cls,
  ...attrs
}: TabsProps): JSX.Element {
  const { List, Trigger, Content } = tabs({
    orientation,
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
