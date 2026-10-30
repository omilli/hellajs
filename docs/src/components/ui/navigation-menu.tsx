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

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const in90 = keyframes({ from: { opacity: "0", transform: "scale(0.9)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });
const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });

const base = style("navigation-menu-base", {
  alignItems: "center",
  display: "flex",
  flex: "1 1 0%",
  justifyContent: "center",
  maxWidth: "max-content",
  position: "relative",
});

const list = style("navigation-menu-list", {
  alignItems: "center",
  display: "flex",
  flex: "1 1 0%",
  gap: "0.25rem",
  justifyContent: "center",
  listStyle: "none",
});

const item = style("navigation-menu-item", {
  position: "relative",
  "& [data-slot='navigation-menu-content-anchor']": {
    display: "contents",
  },
});

const trigger = style("navigation-menu-trigger", {
  alignItems: "center",
  background: tokens.background,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  display: "inline-flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  height: "2.25rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.5rem",
  paddingInline: "1rem",
  transition:
    "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "max-content",
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    outline: "1px solid",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    color: tokens.accentForeground,
  },
  "&[data-state='open']:hover": {
    backgroundColor: tokens.accent,
  },
  "&[data-state='open']:focus": {
    backgroundColor: tokens.accent,
  },
  "&[data-state='open'] svg": {
    transform: "rotate(180deg)",
  },
  "& [data-slot='navigation-menu-chevron']": {
    height: "0.75rem",
    marginLeft: "0.25rem",
    position: "relative",
    top: "1px",
    transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
    width: "0.75rem",
  },
});

const content = style("navigation-menu-content", {
  left: "0",
  padding: "0.5rem",
  paddingRight: "0.625rem",
  top: "0",
  width: "100%",
  "& [data-slot='navigation-menu-link']:focus": {
    boxShadow: "none",
    outlineStyle: "none",
  },
  "& [data-slot='navigation-menu-link']:focus-visible": {
    boxShadow: "none",
    outlineStyle: "none",
  },
  "@media (min-width: 48rem)": {
    "&": {
      position: "absolute",
      width: "auto",
    },
  },
});

const link = style("navigation-menu-link", {
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  fontSize: "0.875rem",
  gap: "0.25rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  padding: "0.5rem",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    outline: "1px solid",
  },
  "&[data-active='true']": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    color: tokens.accentForeground,
  },
  "&[data-active='true']:hover": {
    backgroundColor: tokens.accent,
  },
  "&[data-active='true']:focus": {
    backgroundColor: tokens.accent,
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: tokens.mutedForeground,
  },
});

const viewportWrapper = style("navigation-menu-viewport-wrapper", {
  isolation: "isolate",
  display: "flex",
  justifyContent: "center",
  left: "0",
  position: "absolute",
  top: "100%",
  zIndex: "50",
  "& [data-slot='navigation-menu-viewport']": {
    backgroundColor: tokens.popover,
    border: `1px solid ${tokens.border}`,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
    color: tokens.popoverForeground,
    height: "var(--radix-navigation-menu-viewport-height)",
    marginTop: "0.375rem",
    overflow: "hidden",
    position: "relative",
    transformOrigin: "top center",
    width: "100%",
    "&[data-state='open']": {
      animation: `${in90} 150ms ease-out both`,
    },
    "&[data-state='closed']": {
      animation: `${out} 150ms ease-in both`,
    },
    "@media (min-width: 48rem)": {
      "&": {
        width: "var(--radix-navigation-menu-viewport-width)",
      },
    },
  },
});

const indicator = style("navigation-menu-indicator", {
  alignItems: "flex-end",
  display: "flex",
  height: "0.375rem",
  justifyContent: "center",
  overflow: "hidden",
  top: "100%",
  transition:
    "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: "1",
  "&[data-state='visible']": {
    animation: `${fadeIn} 150ms ease-out both`,
  },
  "&[data-state='hidden']": {
    animation: `${fadeOut} 150ms ease-in both`,
  },
  "& [data-slot='navigation-menu-diamond']": {
    background: tokens.border,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.6)`,
    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    height: "0.5rem",
    position: "relative",
    top: "60%",
    transform: "rotate(45deg)",
    width: "0.5rem",
  },
});

export function NavigationMenuList({
  children,
  class: cls,
  ...attrs
}: NavigationMenuListProps): JSX.Element {
  const { List } = navigationMenu();
  return (
    <List
      class={
        [list, cls]
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
        [item, cls]
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
        [trigger, cls]
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
        [content, cls]
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
        [link, cls]
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
        [viewportWrapper, cls]
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
        [indicator, cls]
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
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </Nav.Root>
  );
}
