import { command } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface CommandItemData {
  value: string;
  label: string;
  group?: string;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

interface RankedItem {
  item: CommandItemData;
  score: number;
}

interface CommandInputProps extends HTMLAttributes<"input"> {
  children?: HellaChildren;
  class?: string;
}

interface CommandListProps extends HTMLAttributes<"div"> {
  /** The listbox id; option ids derive as `<id>-opt-<value>`. */
  id?: string;
  children?: HellaChildren;
  class?: string;
}

interface CommandEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface CommandGroupProps extends HTMLAttributes<"div"> {
  heading?: string;
  hidden?: boolean | (() => boolean);
  children?: HellaChildren;
  class?: string;
}

interface CommandSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

interface CommandItemProps extends HTMLAttributes<"div"> {
  value?: string;
  /** The option's stable id; defaults to `<listId>-opt-<value>` from the owning factory. */
  id?: string;
  disabled?: boolean;
  /** Selected state (the ref's data-selected accent); an accessor follows the owning command's active item. */
  active?: () => boolean;
  /** Called on click and on Enter when the owning command commits. */
  onSelect?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface CommandShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface CommandProps extends HTMLAttributes<"div"> {
  items?: CommandItemData[] | (() => CommandItemData[]);
  /** Replaces the default scoring filter (earlier matches, word-boundary starts, keyword hits). */
  filter?: (items: CommandItemData[], query: string) => CommandItemData[];
  /** Wraps arrow movement at the edges; the default clamps. */
  loop?: boolean;
  /** Controlled active value. When given, the root never writes its internal cursor and onValueChange reports each requested move and selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
  /** Extra chrome rendered below the auto-rendered list (footer hints, custom rows). */
  children?: HellaChildren;
}

interface CommandDialogProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  class?: string;
  children?: HellaChildren;
}

export type { CommandItemData };

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

const base = style("command", {
  backgroundColor: tokens.popover,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: tokens.popoverForeground,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
  width: "100%",
});

const inputWrapper = style("command-input-wrapper", {
  alignItems: "center",
  borderBottom: `1px solid ${tokens.border}`,
  display: "flex",
  gap: "0.5rem",
  height: "2.25rem",
  paddingInline: "0.75rem",
  "& svg": {
    flexShrink: "0",
    height: "1rem",
    opacity: "0.5",
    width: "1rem",
  },
  "& input": {
    backgroundColor: "transparent",
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    display: "flex",
    fontSize: "0.875rem",
    height: "2.5rem",
    lineHeight: "1.25rem",
    outline: "2px solid transparent",
    outlineOffset: "2px",
    paddingBlock: "0.75rem",
    width: "100%",
    "&::placeholder": {
      color: tokens.mutedForeground,
    },
    "&:disabled": {
      cursor: "not-allowed",
      opacity: "0.5",
    },
  },
});

const list = style("command-list", {
  maxHeight: "300px",
  overflowX: "hidden",
  overflowY: "auto",
  scrollPaddingBlock: "0.25rem",
  "& [data-slot='command-item']": {
    alignItems: "center",
    borderRadius: `calc(${tokens.radius} * 0.6)`,
    cursor: "default",
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    lineHeight: "1.25rem",
    outline: "2px solid transparent",
    outlineOffset: "2px",
    paddingInline: "0.5rem",
    paddingBlock: "0.375rem",
    position: "relative",
    userSelect: "none",
    "&[data-disabled='true']": {
      opacity: "0.5",
      pointerEvents: "none",
    },
    "&[data-selected='true']": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
    "& svg": {
      flexShrink: "0",
      pointerEvents: "none",
    },
    "& svg:not([class*='size-'])": {
      height: "1rem",
      width: "1rem",
    },
    "& svg:not([class*='text-'])": {
      color: tokens.mutedForeground,
    },
  },
  "& [data-slot='command-item'] [data-slot='command-shortcut']": {
    color: tokens.mutedForeground,
    fontSize: "0.75rem",
    letterSpacing: "0.1em",
    lineHeight: "1rem",
    marginLeft: "auto",
  },
  "& [data-slot='command-empty']": {
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
    paddingBlock: "1.5rem",
    textAlign: "center",
  },
  "& [data-slot='command-group']": {
    color: tokens.foreground,
    overflow: "hidden",
    padding: "0.25rem",
    "& [data-slot='command-group-heading']": {
      color: tokens.mutedForeground,
      fontSize: "0.75rem",
      fontWeight: "500",
      lineHeight: "1rem",
      paddingInline: "0.5rem",
      paddingBlock: "0.375rem",
    },
  },
});

const empty = style("command-empty", {
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  paddingBlock: "1.5rem",
  textAlign: "center",
});

const group = style("command-group", {
  color: tokens.foreground,
  overflow: "hidden",
  padding: "0.25rem",
  "& [data-slot='command-group-heading']": {
    color: tokens.mutedForeground,
    fontSize: "0.75rem",
    fontWeight: "500",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    paddingBlock: "0.375rem",
  },
});

const separator = style("command-separator", {
  backgroundColor: tokens.border,
  height: "1px",
  marginInline: "-0.25rem",
});

const item = style("command-item", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingInline: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&[data-disabled='true']": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-selected='true']": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: tokens.mutedForeground,
  },
});

const shortcut = style("command-shortcut", {
  color: tokens.mutedForeground,
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
});

/**
 * The whole dialog surface, hung off the one class the wrapper root carries:
 * the factory's `Dialog` part renders the overlay, panel, header, close
 * button, and command surface as descendants of the wrapper, so every rule
 * targets its data-slot from here.
 */
const dialogPanel = style("command-dialog-panel", {
  "& [data-slot='dialog-overlay']": {
    backgroundColor: "rgb(0 0 0 / 0.5)",
    inset: "0",
    position: "fixed",
    zIndex: "50",
    "&[data-state='open']": {
      animation: `${fadeIn} 150ms ease-out both`,
    },
    "&[data-state='closed']": {
      animation: `${fadeOut} 150ms ease-in both`,
    },
  },
  "& [data-slot='dialog-content']": {
    background: tokens.background,
    border: `1px solid ${tokens.border}`,
    borderRadius: tokens.radius,
    boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    display: "grid",
    gap: "1rem",
    left: "50%",
    maxWidth: "calc(100% - 2rem)",
    outlineStyle: "none",
    overflow: "hidden",
    padding: "0",
    position: "fixed",
    top: "50%",
    translate: "-50% -50%",
    width: "100%",
    zIndex: "50",
    "&[data-state='open']": {
      animation: `${zoomIn} 200ms ease-out both`,
    },
    "&[data-state='closed']": {
      animation: `${zoomOut} 200ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "32rem",
      },
    },
  },
  "& [data-slot='dialog-content'] [data-slot='dialog-header']": {
    clip: "rect(0, 0, 0, 0)",
    borderWidth: "0",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
  "& [data-slot='dialog-content'] [data-slot='dialog-title']": {
    fontSize: "1.125rem",
    fontWeight: "600",
    lineHeight: "1",
  },
  "& [data-slot='dialog-content'] [data-slot='dialog-description']": {
    color: tokens.mutedForeground,
    fontSize: "0.875rem",
    lineHeight: "1.25rem",
  },
  "& [data-slot='dialog-content'] [data-slot='dialog-close']": {
    borderRadius: `calc(${tokens.radius} * 0.2)`,
    opacity: "0.7",
    position: "absolute",
    right: "1rem",
    top: "1rem",
    transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
    "&:hover": {
      opacity: "1",
    },
    "&:focus": {
      boxShadow: `0 0 0 2px ${tokens.background}, 0 0 0 4px ${tokens.ring}`,
      outlineStyle: "none",
    },
    "&:disabled": {
      pointerEvents: "none",
    },
    "&[data-state='open']": {
      backgroundColor: tokens.accent,
      color: tokens.mutedForeground,
    },
    "& svg": {
      flexShrink: "0",
      pointerEvents: "none",
    },
    "& svg:not([class*='size-'])": {
      height: "1rem",
      width: "1rem",
    },
    "& span": {
      clip: "rect(0, 0, 0, 0)",
      borderWidth: "0",
      height: "1px",
      margin: "-1px",
      overflow: "hidden",
      padding: "0",
      position: "absolute",
      whiteSpace: "nowrap",
      width: "1px",
    },
  },
  "& [data-slot='dialog-content'] [data-slot='command']": {
    backgroundColor: tokens.popover,
    borderRadius: `calc(${tokens.radius} * 0.8)`,
    color: tokens.popoverForeground,
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    width: "100%",
    "& [data-slot='command-input-wrapper']": {
      height: "3rem",
    },
    "& [data-slot='command-input-wrapper'] svg": {
      height: "1.25rem",
      width: "1.25rem",
    },
    "& [data-slot='command-input']": {
      height: "3rem",
    },
    "& [data-slot='command-group']": {
      paddingInline: "0.5rem",
    },
    "& [data-slot='command-group']:not([hidden]) ~ [data-slot='command-group']": {
      paddingTop: "0",
    },
    "& [data-slot='command-group-heading']": {
      color: tokens.mutedForeground,
      fontWeight: "500",
      paddingInline: "0.5rem",
    },
    "& [data-slot='command-item']": {
      paddingBlock: "0.75rem",
      paddingInline: "0.5rem",
    },
    "& [data-slot='command-item'] svg": {
      height: "1.25rem",
      width: "1.25rem",
    },
  },
});

/** The search row; the composed Command threads the query and keyboard model through the factory. */
export function CommandInput({ children, class: cls, ...attrs }: CommandInputProps): JSX.Element {
  const { Input } = command();
  return (
    <Input
      class={
        [inputWrapper, cls]
      }
      {...attrs}
    >
      {children}
    </Input>
  );
}

/** The scrolling `role="listbox"`; the composed Command hands the factory its items and renders the ranked body. */
export function CommandList({ id, children, class: cls, ...attrs }: CommandListProps): JSX.Element {
  const { List } = command();
  return (
    <List
      id={id}
      class={
        [list, cls]
      }
      {...attrs}
    >
      {children}
    </List>
  );
}

export function CommandEmpty({ children, class: cls, ...attrs }: CommandEmptyProps): JSX.Element {
  const { Empty } = command();
  return (
    <Empty
      class={
        [empty, cls]
      }
      {...attrs}
    >
      {children}
    </Empty>
  );
}

export function CommandGroup({
  heading,
  hidden,
  children,
  class: cls,
  ...attrs
}: CommandGroupProps): JSX.Element {
  const { Group } = command();
  return (
    <Group
      heading={heading}
      hidden={hidden}
      class={
        [group, cls]
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function CommandSeparator({ class: cls, ...attrs }: CommandSeparatorProps): JSX.Element {
  const { Separator } = command();
  return (
    <Separator
      class={
        [separator, cls]
      }
      {...attrs}
    />
  );
}

export function CommandItem({
  value,
  id,
  disabled,
  active,
  onSelect,
  children,
  class: cls,
  ...attrs
}: CommandItemProps): JSX.Element {
  const { Item } = command();
  return (
    <Item
      value={value}
      id={id}
      disabled={disabled}
      active={active}
      onSelect={onSelect}
      class={
        [item, cls]
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function CommandShortcut({
  children,
  class: cls,
  ...attrs
}: CommandShortcutProps): JSX.Element {
  const { Shortcut } = command();
  return (
    <Shortcut
      class={
        [shortcut, cls]
      }
      {...attrs}
    >
      {children}
    </Shortcut>
  );
}

/**
 * The palette dialog: the factory's `Dialog` part — overlay, portaled panel
 * with trap/escape/outside arming, screen-reader header, close button, and the
 * command surface — styled through descendants of the one wrapper-root class.
 * Manual parts compose inside through children.
 */
export function CommandDialog({
  open,
  onClose,
  title: titleText,
  description: descriptionText,
  children,
  class: cls,
  ...attrs
}: CommandDialogProps): JSX.Element {
  const { Dialog } = command();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleText}
      description={descriptionText}
      class={
        [dialogPanel, cls]
      }
      {...attrs}
    >
      {children}
    </Dialog>
  );
}

export function Command({
  items,
  filter,
  loop,
  value,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: CommandProps): JSX.Element {
  const C = command({ items, filter, loop, value, onValueChange });
  return (
    <div
      data-slot="command"
      class={
        [base, cls]
      }
      {...attrs}
    >
      <C.Input
        class={
          [inputWrapper]
        }
      />
      <C.List
        class={
          [list]
        }
      />
      {children}
    </div>
  );
}
