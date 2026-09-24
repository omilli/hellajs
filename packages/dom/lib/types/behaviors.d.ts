export interface TrapFocusOptions {
  /** Element to focus on trap; defaults to the first focusable child. */
  initialFocus?: () => HTMLElement | undefined;
  /** Restore focus to the pre-trap activeElement on release. Default true. */
  restoreFocus?: boolean;
}

export interface RovingTabIndexOptions {
  /** Item selector; defaults to the shared focusable collector. */
  selector?: string;
  /** Axis the arrow keys traverse; both axes active when unset. */
  orientation?: "horizontal" | "vertical";
  /** Wrap from the last item to the first and back. Default true. */
  loop?: boolean;
}

/** Requested anchor placement — four sides × start/end/center alignment. */
export type Placement =
  | "top"
  | "top-start"
  | "top-end"
  | "bottom"
  | "bottom-start"
  | "bottom-end"
  | "left"
  | "left-start"
  | "left-end"
  | "right"
  | "right-start"
  | "right-end";

export interface AnchorPositionOptions {
  /** Requested side and alignment; flips to the opposite side on viewport collision. Default "bottom". */
  placement?: Placement;
  /** Gap between the anchor and the floating edge, in px. Default 0. */
  offset?: number;
  /** Stretch the floating to the anchor's width (menu/select surfaces). */
  matchAnchorWidth?: boolean;
  /** Resolves `-start/-end` on the horizontal axis. Default ltr (anchor's computed `direction` in `anchorPosition`). */
  dir?: "ltr" | "rtl";
  /** Called after each reposition with the final placement (menus re-check flip). */
  onUpdate?: (placement: Placement) => void;
}

export interface HoverIntentOptions {
  /** Fired when the open delay elapses, or instantly inside the shared skip-delay window. */
  onOpen: () => void;
  /** Fired after the close delay, on an outside pointerdown while open, or on keyboard blur. */
  onClose: () => void;
  /** Pointer-hover ms before onOpen fires. Default 700. */
  openDelay?: number;
  /** Pointer-leave ms before onClose fires. Default 300. */
  closeDelay?: number;
}

export interface DragHandlers {
  /** Fired once on primary-button pointerdown, before the first move. */
  onStart?: (event: PointerEvent) => void;
  /** Fired per pointermove while dragging, with deltas accumulated from the drag start. */
  onMove: (delta: { dx: number; dy: number; event: PointerEvent }) => void;
  /** Fired once on pointerup, pointercancel, or lostpointercapture. */
  onEnd?: () => void;
}
