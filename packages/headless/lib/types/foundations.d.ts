export interface ModalOptions {
  /** The component's open-state getter; `"open"` arms the wiring, `"closed"` disarms it. */
  state: () => "open" | "closed";
  /** Called by escape and outside dismissal while armed. */
  onClose?: () => void;
  /** Arm Escape-key dismissal. Default true. */
  escape?: boolean;
  /** Arm outside-pointerdown dismissal. Default true. */
  outside?: boolean;
  /** Called when the exit animation or transition ends while `state()` is `"closed"` — the exit-unmount trigger. */
  onExited?: () => void;
}
