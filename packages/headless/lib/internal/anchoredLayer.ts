import { registry } from "@hellajs/dom";
import { anchorPosition } from "../anchorPosition";
import { layerDismissal } from "../layerDismissal";
import type { AnchorAlign, AnchorSide } from "../types/parts";

/**
 * Options for the anchored-layer engine: the non-modal sibling of `modal` —
 * anchoring, stacked Escape/outside dismissal, and exit notification without
 * a focus trap.
 * @internal
 */
export interface AnchoredLayerOptions {
  /** The layer's open-state getter; `"open"` arms the wiring, `"closed"` disarms it. */
  state: () => "open" | "closed";
  /** Resolves the positioning anchor; positioning is skipped when undefined. */
  anchor: () => Element | null | undefined;
  /** Requested side. Default `"bottom"`. */
  side?: AnchorSide;
  /** Requested alignment along the side. Default `"center"`. */
  align?: AnchorAlign;
  /** Gap between the anchor and the layer edge, in px. Default 4. */
  sideOffset?: number;
  /** Cross-axis shift applied after positioning, in px. Default 0. */
  alignOffset?: number;
  /** Called by Escape and an outside pointerdown while armed and top of the layer stack. */
  onDismiss?: () => void;
  /** Called when the exit animation or transition ends while `state()` is `"closed"` — the exit-unmount trigger. */
  onExited?: () => void;
  /** Resolves the element focused when the layer arms; defaults to the layer node itself. */
  focusTarget?: () => HTMLElement | null | undefined;
  /** Arms consumer wiring while open — each pushed disposer drains on the close flip and at node removal, so the wiring never outlives the armed state. */
  arm?: (push: (dispose: () => void) => void) => void;
}

/**
 * Arms an anchored overlay layer: fixed positioning against an anchor, stacked
 * Escape and outside dismissal, focus on open, the exit-notify hook the
 * layer unmounts through, and an open-scoped arm hook for consumer wiring. The
 * non-modal sibling of `modal` — no focus trap;
 * dismissal rides the shared layer stack. Wiring is owned by the node — the
 * arms re-arm with the `state` getter (armed while `"open"`, disarmed while
 * `"closed"`, so the exit runs unwired), and everything disposes automatically
 * when the node leaves the DOM. Not part of the public surface: internal until
 * a second consumer generalizes it.
 *
 * ```ts
 * // inside hook:afterMount, where node is the layer element
 * anchoredLayer(node, {
 *   state, // () => "open" | "closed"
 *   anchor: () => triggerNode,
 *   onDismiss: () => open(false),
 *   onExited: () => unmount(),
 * });
 * ```
 * @param node The layer element the wiring arms against.
 * @param options `state` and `anchor` getters plus optional placement offsets, `onDismiss`, `onExited`, `focusTarget`, `arm`.
 */
export function anchoredLayer(node: HTMLElement, options: AnchoredLayerOptions): void {
  const state = options.state;
  const anchor = options.anchor;
  const onDismiss = options.onDismiss;
  const onExited = options.onExited;
  const focusTarget = options.focusTarget;
  const arm = options.arm;
  const side = options.side ?? "bottom";
  const align = options.align ?? "center";
  const sideOffset = options.sideOffset ?? 4;
  const alignOffset = options.alignOffset ?? 0;

  // The re-armable arms live in one node-registered effect, held in a closure
  // the body disarms at its start — flipping to "closed" tears anchoring and
  // dismissal down immediately (the exit runs unwired), flipping back to
  // "open" re-arms, and node removal stops the effect so nothing re-arms. The
  // registry's effect bodies return void — cleanup capture is not available,
  // so the arms ride the closure, not a cleanup return.
  const armed: (() => void)[] = [];
  registry.addEffect(node, () => {
    while (armed.length) armed.pop()!();
    if (state() === "closed") return;
    const anchorEl = anchor();
    if (anchorEl != null) {
      armed.push(
        anchorPosition(anchorEl, node, {
          placement: align === "center" ? side : `${side}-${align}`,
          offset: sideOffset,
        }),
      );
    }
    if (alignOffset !== 0) {
      // Cross-axis shift over the placed coordinates; the placement axis
      // stays owned by anchorPosition's left/top writes.
      node.style.translate =
        side === "top" || side === "bottom" ? `${alignOffset}px 0` : `0 ${alignOffset}px`;
    }
    if (onDismiss) armed.push(layerDismissal(() => [node, anchorEl ?? null], onDismiss));
    // Consumer wiring rides the same armed list: pushed when the layer opens,
    // drained by the same flips and node removal, so Escape/outside teardown
    // and consumer teardown can never drift apart.
    if (arm) arm((dispose) => armed.push(dispose));
    // Non-modal: no trap — focus moves to the resolved target (the layer by
    // default) on open, upstream parity.
    (focusTarget?.() ?? node).focus();
  });

  // The exit-notify listener ties to the node, NOT to state: installed once,
  // never removed on the close-flip disarm (that would kill onExited before
  // the exit animation ends) — removed only at node disposal. animationend
  // is unfiltered (bubbled child animations count); transitionend is filtered
  // to the node's own transform (a transition-based exit channel — child
  // property transitions must stay inert).
  if (onExited) {
    const onExitEnd = (event: Event): void => {
      if (state() !== "closed") return;
      if (event.type === "transitionend") {
        if (event.target === node && (event as TransitionEvent).propertyName === "transform") {
          onExited();
        }
      } else {
        onExited();
      }
    };
    node.addEventListener("animationend", onExitEnd);
    node.addEventListener("transitionend", onExitEnd);
    registry.addHook(node, "beforeDestroy", () => {
      node.removeEventListener("animationend", onExitEnd);
      node.removeEventListener("transitionend", onExitEnd);
    });
  }

  // Node removal disposes whatever is armed — the document-level dismissal
  // listeners must not outlive the layer.
  registry.addHook(node, "beforeDestroy", () => {
    while (armed.length) armed.pop()!();
  });
}
