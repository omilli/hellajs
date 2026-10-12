import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export /**
 * The state SidebarProvider threads to its children function - hella has no
 * context primitive, so the provider's composition root hands every manual
 * part its accessors (the dual-surface counterpart of the ref's useSidebar).
 */
interface SidebarState {
  /** Desktop expanded state. */
  open: () => boolean;
  /** Desktop open setter (writes the internal signal unless controlled). */
  setOpen: (open: boolean) => void;
  /** Mobile viewport (max-width: 769px). */
  mobile: () => boolean;
  /** Mobile sheet open state. */
  openMobile: () => boolean;
  /** Mobile sheet open setter. */
  setOpenMobile: (open: boolean) => void;
  /** Toggles the mobile sheet on mobile, the desktop open state otherwise. */
  onToggle: () => void;
}

export interface SidebarProviderProps extends HTMLAttributes<"div"> {
  /** Controlled open state. When given, the provider never writes its internal signal and `onOpenChange` reports the requested flip. */
  open?: () => boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: (state: SidebarState) => HellaChildren;
  class?: string;
}

export type SidebarSide = "left" | "right";

export type SidebarVariant = "sidebar" | "floating" | "inset";

export type SidebarCollapsible = "offcanvas" | "icon" | "none";

export interface SidebarProps extends HTMLAttributes<"div"> {
  /** Desktop expanded accessor threaded from SidebarProvider. */
  open?: () => boolean;
  /** Mobile viewport accessor threaded from SidebarProvider. */
  mobile?: () => boolean;
  /** Mobile sheet open accessor threaded from SidebarProvider. */
  openMobile?: () => boolean;
  /** Mobile sheet open setter threaded from SidebarProvider. */
  onOpenMobileChange?: (open: boolean) => void;
  side?: SidebarSide;
  variant?: SidebarVariant;
  collapsible?: SidebarCollapsible;
  class?: string;
  children?: HellaChildren;
}

export interface SidebarMobileSheetProps {
  open: () => boolean;
  onClose: () => void;
  side: SidebarSide;
  children?: HellaChildren;
}

export interface SidebarTriggerProps extends HTMLAttributes<"button"> {
  onToggle?: () => void;
  class?: string;
}

export interface SidebarRailProps extends HTMLAttributes<"button"> {
  onToggle?: () => void;
  class?: string;
  children?: HellaChildren;
}

export interface SidebarPartProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface SidebarInputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export interface SidebarGroupActionProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
}

export interface SidebarMenuButtonProps extends HTMLAttributes<"button"> {
  active?: boolean;
  /** Tooltip label shown while the sidebar is collapsed to icon mode (hover). */
  tooltip?: HellaChildren;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  /** Desktop open accessor threaded from SidebarProvider; the tooltip hides while expanded. */
  open?: () => boolean;
  /** Mobile viewport accessor threaded from SidebarProvider; the tooltip never shows on mobile. */
  mobile?: () => boolean;
  class?: string;
  children?: HellaChildren;
}

export interface SidebarMenuActionProps extends HTMLAttributes<"button"> {
  showOnHover?: boolean;
  class?: string;
  children?: HellaChildren;
}

export interface SidebarMenuSkeletonProps extends HTMLAttributes<"div"> {
  showIcon?: boolean;
  class?: string;
}

export interface SidebarMenuSubButtonProps extends HTMLAttributes<"a"> {
  size?: "sm" | "md";
  active?: boolean;
  class?: string;
  children?: HellaChildren;
}
