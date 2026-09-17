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
