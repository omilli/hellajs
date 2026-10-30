import { navigationMenu } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface NavigationMenuListProps extends HTMLAttributes<"ul"> {
  children?: HellaChildren;
  class?: string;
}

interface NavigationMenuItemProps extends HTMLAttributes<"li"> {
  children?: HellaChildren;
  class?: string;
}

interface NavigationMenuTriggerProps extends HTMLAttributes<"button"> {
  /** This trigger's id in the root's open-value store; clicks announce it when no `onActivate` stands in. */
  value?: string;
  /** Resolves the open state for `aria-expanded`/`data-state`; manual wiring threads it from the owning signal. */
  active?: () => boolean;
  onActivate?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface NavigationMenuContentProps extends HTMLAttributes<"div"> {
  /** Resolves the open state; manual wiring threads it from the owning signal. */
  active?: () => boolean;
  /** Portal target for the shared viewport slot; defaults to the first `[data-slot="navigation-menu-viewport"]` in the document. */
  viewport?: string;
  /** Called when the exit animation ends under data-state="closed"; entry animationends are ignored. */
  onExited?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface NavigationMenuLinkProps extends HTMLAttributes<"a"> {
  /** Renders `data-active="true"` and its accent styles (the ref's data-[active=true] set). */
  active?: boolean;
  children?: HellaChildren;
  class?: string;
}

interface NavigationMenuViewportProps extends HTMLAttributes<"div"> {
  /** Resolves the open state for the viewport's enter/exit `data-state`; the composed root wires its own store. */
  active?: () => boolean;
  class?: string;
}

interface NavigationMenuIndicatorProps extends HTMLAttributes<"div"> {
  /** Resolves the visible state (any panel open); manual wiring threads it from the owning signal. */
  active?: () => boolean;
  /** Resolves the trigger the indicator sits under; defaults to the trigger announced by the activation stream. */
  anchor?: () => Element | undefined;
  children?: HellaChildren;
  class?: string;
}

interface NavigationMenuProps extends HTMLAttributes<"div"> {
  /** Controlled id of the open panel ("" when closed), fed by trigger announcements; the root never writes it when given. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  /** Renders the shared viewport slot as the last child (default true); set false to render `NavigationMenuViewport` manually. */
  viewport?: boolean;
  children?: HellaChildren;
  class?: string;
}
import { cn } from "./cn.js";

export function NavigationMenuList({
  children,
  class: cls,
  ...attrs
}: NavigationMenuListProps): JSX.Element {
  const { List } = navigationMenu();
  return (
    <List
      class={
        cn("group flex flex-1 list-none items-center justify-center gap-1", cls)
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
        cn("relative [&_[data-slot=navigation-menu-content-anchor]]:contents", cls)
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
        cn("group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent [&_[data-slot=navigation-menu-chevron]]:relative [&_[data-slot=navigation-menu-chevron]]:top-[1px] [&_[data-slot=navigation-menu-chevron]]:ml-1 [&_[data-slot=navigation-menu-chevron]]:size-3 [&_[data-slot=navigation-menu-chevron]]:transition [&_[data-slot=navigation-menu-chevron]]:duration-300 [&[data-state=open]_[data-slot=navigation-menu-chevron]]:rotate-180", cls)
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
        cn("top-0 left-0 w-full p-2 pr-2.5 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out md:absolute md:w-auto group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95", cls)
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
        cn("flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground data-[active=true]:hover:bg-accent data-[active=true]:focus:bg-accent [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", cls)
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
        cn("absolute top-full left-0 isolate z-50 flex justify-center [&_[data-slot=navigation-menu-viewport]]:origin-top-center [&_[data-slot=navigation-menu-viewport]]:relative [&_[data-slot=navigation-menu-viewport]]:mt-1.5 [&_[data-slot=navigation-menu-viewport]]:h-[var(--radix-navigation-menu-viewport-height)] [&_[data-slot=navigation-menu-viewport]]:w-full [&_[data-slot=navigation-menu-viewport]]:overflow-hidden [&_[data-slot=navigation-menu-viewport]]:rounded-md [&_[data-slot=navigation-menu-viewport]]:border [&_[data-slot=navigation-menu-viewport]]:bg-popover [&_[data-slot=navigation-menu-viewport]]:text-popover-foreground [&_[data-slot=navigation-menu-viewport]]:shadow [&[data-state=closed]_[data-slot=navigation-menu-viewport]]:animate-out [&[data-state=closed]_[data-slot=navigation-menu-viewport]]:zoom-out-95 [&[data-state=open]_[data-slot=navigation-menu-viewport]]:animate-in [&[data-state=open]_[data-slot=navigation-menu-viewport]]:zoom-in-90 md:[&_[data-slot=navigation-menu-viewport]]:w-[var(--radix-navigation-menu-viewport-width)]", cls)
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
        cn("top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in transition-[transform,width] duration-200 [&_[data-slot=navigation-menu-diamond]]:relative [&_[data-slot=navigation-menu-diamond]]:top-[60%] [&_[data-slot=navigation-menu-diamond]]:h-2 [&_[data-slot=navigation-menu-diamond]]:w-2 [&_[data-slot=navigation-menu-diamond]]:rotate-45 [&_[data-slot=navigation-menu-diamond]]:rounded-tl-sm [&_[data-slot=navigation-menu-diamond]]:bg-border [&_[data-slot=navigation-menu-diamond]]:shadow-md", cls)
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
        cn("group/navigation-menu relative flex max-w-max flex-1 items-center justify-center", cls)
      }
      {...attrs}
    >
      {children}
    </Nav.Root>
  );
}
