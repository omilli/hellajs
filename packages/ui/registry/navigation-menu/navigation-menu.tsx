import { navigationMenu } from "@hellajs/headless";
import type {
  NavigationMenuListProps,
  NavigationMenuItemProps,
  NavigationMenuTriggerProps,
  NavigationMenuContentProps,
  NavigationMenuLinkProps,
  NavigationMenuViewportProps,
  NavigationMenuIndicatorProps,
  NavigationMenuProps,
} from "./navigation-menu-types.js";

// @hella:styles
declare const base: string;
declare const content: string;
declare const indicator: string;
declare const item: string;
declare const link: string;
declare const list: string;
declare const trigger: string;
declare const viewportWrapper: string;
// @hella:end

export function NavigationMenuList({
  children,
  class: cls,
  ...attrs
}: NavigationMenuListProps): JSX.Element {
  const { List } = navigationMenu();
  return (
    <List
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

export function NavigationMenuItem({
  children,
  class: cls,
  ...attrs
}: NavigationMenuItemProps): JSX.Element {
  const { Item } = navigationMenu();
  return (
    <Item
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

export function NavigationMenuTrigger({
  value,
  active: activeProp,
  onActivate,
  children,
  class: cls,
  ...attrs
}: NavigationMenuTriggerProps): JSX.Element {
  const { Trigger } = navigationMenu();
  return (
    <Trigger
      value={value}
      active={activeProp}
      onActivate={onActivate}
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

export function NavigationMenuContent({
  active: activeProp,
  viewport: viewportSlot,
  onExited,
  children,
  class: cls,
  ...attrs
}: NavigationMenuContentProps): JSX.Element {
  const { Content } = navigationMenu();
  return (
    <Content
      active={activeProp}
      viewport={viewportSlot}
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

export function NavigationMenuLink({
  active,
  children,
  class: cls,
  ...attrs
}: NavigationMenuLinkProps): JSX.Element {
  const { Link } = navigationMenu();
  return (
    <Link
      active={active}
      class={
        // @hella:compose
        [link, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Link>
  );
}

export function NavigationMenuViewport({
  active: activeProp,
  id,
  class: cls,
  ...attrs
}: NavigationMenuViewportProps): JSX.Element {
  const { Viewport } = navigationMenu();
  return (
    <Viewport
      active={activeProp}
      id={id}
      class={
        // @hella:compose
        [viewportWrapper, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function NavigationMenuIndicator({
  active: activeProp,
  anchor,
  class: cls,
  ...attrs
}: NavigationMenuIndicatorProps): JSX.Element {
  const { Indicator } = navigationMenu();
  return (
    <Indicator
      active={activeProp}
      anchor={anchor}
      class={
        // @hella:compose
        [indicator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function NavigationMenu({
  value: valueProp,
  onValueChange,
  viewport,
  children,
  class: cls,
  ...attrs
}: NavigationMenuProps): JSX.Element {
  const Nav = navigationMenu({
    value: valueProp,
    onValueChange,
    viewport: viewport !== false,
  });
  return (
    <Nav.Root
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Nav.Root>
  );
}
