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

export interface SwipeState {
  /** Horizontal distance from the swipe start. */
  dx: number;
  /** Vertical distance from the swipe start. */
  dy: number;
  /** The pointermove event that produced the deltas. */
  event: PointerEvent;
}

export interface SwipeCommit {
  /** Dominant axis and sign of the released swipe. */
  direction: "left" | "right" | "up" | "down";
  /** Total horizontal distance from the swipe start. */
  dx: number;
  /** Total vertical distance from the swipe start. */
  dy: number;
}

export interface SwipeHandlers {
  /** Fired once on primary-button pointerdown, before the first move. */
  onStart?: (event: PointerEvent) => void;
  /** Fired per pointermove while swiping, with deltas accumulated from the swipe start. */
  onMove: (state: SwipeState) => void;
  /** Fired once on release when the dominant axis crosses the threshold or its release velocity crosses the floor. */
  onCommit?: (info: SwipeCommit) => void;
  /** Fired once on a release meeting neither commit condition. */
  onCancel?: () => void;
}

export interface SwipeOptions {
  /** Dominant-axis px distance that commits on release. Default 50. */
  threshold?: number;
  /** Release velocity floor in px/ms that commits below threshold. Default 0.5. */
  velocity?: number;
}

export interface PinchState {
  /** Current two-pointer distance over the baseline distance. */
  scale: number;
  /** Horizontal centroid delta from the gesture start. */
  dx: number;
  /** Vertical centroid delta from the gesture start. */
  dy: number;
}

export interface PinchHandlers {
  /** Fired once when the second pointer lands, before the first move. */
  onStart?: (event: PointerEvent) => void;
  /** Fired per tracked-pointer move while pinching, with scale and centroid deltas from the gesture start. */
  onMove: (state: PinchState) => void;
  /** Fired once when either tracked pointer ends. */
  onEnd?: () => void;
}

export interface LongPressOptions {
  /** Hold time in ms before the press fires. Default 500. */
  duration?: number;
  /** Pointer drift in px tolerated before the press cancels. Default 8. */
  tolerance?: number;
}

export interface DoubleTapOptions {
  /** Fired when a second tap's pointerup lands within `interval` of the first. */
  onDoubleTap: (event: PointerEvent) => void;
  /** Fires once when no second tap arrives within `interval`. Opt-in. */
  onSingleTap?: (event: PointerEvent) => void;
  /** Max ms between the two taps' pointerup events. Default 250. */
  interval?: number;
}
