import { dialog } from "@hellajs/headless";
import { Portal } from "@hellajs/dom";
import type { HellaChild, HellaChildren } from "@hellajs/dom";
import type {
  AlertDialogOverlayProps,
  AlertDialogPortalProps,
  AlertDialogTriggerProps,
  AlertDialogContentProps,
  AlertDialogPartProps,
  AlertDialogTitleProps,
  AlertDialogDescriptionProps,
  AlertDialogActionProps,
  AlertDialogCancelProps,
  AlertDialogProps,
} from "./alert-dialog-types.js";

// @hella:styles
declare const base: string;
declare const buttonBase: string;
declare const buttonSizes: Record<string, string>;
declare const buttonVariants: Record<string, string>;
declare const content: string;
declare const description: string;
declare const footer: string;
declare const header: string;
declare const media: string;
declare const title: string;
// @hella:end

/** The screen-covering backdrop; the factory's Overlay with the backdrop style. */
export function AlertDialogOverlay({
  state,
  class: cls,
  ...attrs
}: AlertDialogOverlayProps): JSX.Element {
  const { Overlay } = dialog({ open: () => (state?.() ?? "open") === "open" });
  return (
    <Overlay
      data-slot="alert-dialog-overlay"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

/** Portals the manual composition's parts into document.body. */
export function AlertDialogPortal(props: AlertDialogPortalProps): JSX.Element {
  return <Portal to="body">{props.children}</Portal>;
}

/** The manual trigger button; the factory's Trigger owning the aria contract over the wrapper's own state. */
export function AlertDialogTrigger({
  children,
  class: cls,
  ...attrs
}: AlertDialogTriggerProps): JSX.Element {
  const { Trigger } = dialog();
  return (
    <Trigger
      data-slot="alert-dialog-trigger"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

/**
 * The alert dialog panel. Manual composition portals it alongside an
 * AlertDialogOverlay sibling - hella has no Radix context, so the
 * portal/overlay pairing is the composer's (the AlertDialog export below
 * shows the wired composition). Unlike DialogContent there is no outside
 * dismissal: Radix's AlertDialog semantics are escape-only by design. The
 * panel renders inline where placed: the factory's gate and portal belong
 * to the composed AlertDialog.
 */
export function AlertDialogContent({
  state,
  size,
  closeOnEscape,
  onClose,
  onExited,
  children,
  class: cls,
  ...attrs
}: AlertDialogContentProps): JSX.Element {
  const { Content } = dialog({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onClose?.();
    },
  });
  return (
    <Content
      portal={false}
      data-slot="alert-dialog-content"
      role="alertdialog"
      data-size={size ?? "default"}
      escape={closeOnEscape}
      outside={false}
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

export function AlertDialogHeader({
  children,
  class: cls,
  ...attrs
}: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-header"
      class={
        // @hella:compose
        [header, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function AlertDialogFooter({
  children,
  class: cls,
  ...attrs
}: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-footer"
      class={
        // @hella:compose
        [footer, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function AlertDialogTitle({
  id,
  children,
  class: cls,
  ...attrs
}: AlertDialogTitleProps): JSX.Element {
  return (
    <h2
      id={id}
      data-slot="alert-dialog-title"
      class={
        // @hella:compose
        [title, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </h2>
  );
}

export function AlertDialogDescription({
  id,
  children,
  class: cls,
  ...attrs
}: AlertDialogDescriptionProps): JSX.Element {
  return (
    <p
      id={id}
      data-slot="alert-dialog-description"
      class={
        // @hella:compose
        [description, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </p>
  );
}

export function AlertDialogMedia({
  children,
  class: cls,
  ...attrs
}: AlertDialogPartProps): JSX.Element {
  return (
    <div
      data-slot="alert-dialog-media"
      class={
        // @hella:compose
        [media, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

/** The confirm button - a composed Button (default variant) calling the close path. */
export function AlertDialogAction({
  variant,
  size,
  onClose,
  "on:click": userClick,
  children,
  class: cls,
  ...attrs
}: AlertDialogActionProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="alert-dialog-action"
      data-variant={variant ?? "default"}
      class={
        // @hella:compose
        [buttonBase, buttonVariants[variant ?? "default"], buttonSizes[size ?? "default"], cls]
        // @hella:end
      }
      on:click={function (e) {
        userClick?.call(this, e);
        onClose?.();
      }}
      {...attrs}
    >
      {children}
    </button>
  );
}

/** The dismiss button - a composed Button (outline variant) calling the close path. */
export function AlertDialogCancel({
  variant,
  size,
  onClose,
  "on:click": userClick,
  children,
  class: cls,
  ...attrs
}: AlertDialogCancelProps): JSX.Element {
  return (
    <button
      type="button"
      data-slot="alert-dialog-cancel"
      data-variant={variant ?? "outline"}
      class={
        // @hella:compose
        [buttonBase, buttonVariants[variant ?? "outline"], buttonSizes[size ?? "default"], cls]
        // @hella:end
      }
      on:click={function (e) {
        userClick?.call(this, e);
        onClose?.();
      }}
      {...attrs}
    >
      {children}
    </button>
  );
}

let alertDialogCount = 0;

export function AlertDialog({
  open,
  onClose,
  title: titleText,
  description: descriptionText,
  size,
  closeOnEscape,
  children,
  class: cls,
  ...attrs
}: AlertDialogProps): JSX.Element {
  const titleId = `hella-alert-dialog-title-${++alertDialogCount}`;
  const descriptionId = `hella-alert-dialog-description-${alertDialogCount}`;
  const { Content } = dialog({
    open,
    onOpenChange: (next) => {
      if (!next) onClose();
    },
  });

  return (
    <Content
      data-slot="alert-dialog-content"
      role="alertdialog"
      data-size={size ?? "default"}
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      aria-labelledby={titleId}
      aria-describedby={descriptionText === undefined ? undefined : descriptionId}
      escape={closeOnEscape}
      outside={false}
      overlay={(state) => <AlertDialogOverlay state={state} />}
      {...attrs}
      children={
        [
          ...(titleText !== undefined
            ? [<AlertDialogTitle id={titleId}>{titleText}</AlertDialogTitle>]
            : []),
          ...(descriptionText !== undefined
            ? [
                <AlertDialogDescription id={descriptionId}>
                  {descriptionText}
                </AlertDialogDescription>,
              ]
            : []),
          ...flattenChildren(children),
        ] as HellaChild[]
      }
    />
  );
}

/** Flattens a HellaChildren value into HellaChild[] for explicit children props. */
function flattenChildren(children: HellaChildren | undefined): HellaChild[] {
  if (children === undefined) return [];
  return Array.isArray(children) ? children : [children];
}
