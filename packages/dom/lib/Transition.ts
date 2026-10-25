import { isString } from "./internal/core";
import { resolveValue } from "./internal/utils";
import { resolveNode, childNamespaceOf } from "./internal/render";
import { cleanupSubtree } from "./internal/cleanup";
import { registry } from "./registry";
import { getState } from "./internal/state";
import { peekHydrateContext } from "./internal/hydrate";
import { adoptClaimFrame } from "./internal/claims";
import type { TransitionProps } from "./types/nodes";

/**
 * Wraps conditional content with enter/leave CSS animations.
 * Uses boundary markers for cleanup tracking, similar to ForEach and Lazy.
 * Manages enter/leave timing via setTimeout without modifying the synchronous cleanup system.
 * @param props Component props with show, children, enter, leave, duration, and appear
 * @returns Function that mounts the transition into a parent element
 */
export function Transition(props: TransitionProps): JSX.Element {
  const { show, children, enter, leave, duration = 300, appear } = props;

  const fn = ((parent: Element) => {
    const hctx = peekHydrateContext();
    const anchor = hctx ? hctx.anchor : document.createTextNode("");
    if (!hctx) parent.appendChild(anchor);

    let current: Node | null = null;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    let isFirstRender = true;

    registry.addEffect(anchor, () => {
      const isFirst = isFirstRender;
      isFirstRender = false;

      const isVisible = resolveValue(show) as boolean;

      if (isVisible) {
        if (leaveTimer) {
          clearTimeout(leaveTimer);
          leaveTimer = null;
          if (leave && current instanceof Element) {
            current.classList.remove(leave);
          }
          return;
        }

        if (!current && isFirst && hctx && hctx.existingNodes.length > 0) {
          // hydrate: claim+wire the compiled children build against the server-rendered child —
          // the frame seeds the claim cursor at the region head, so the build's construction
          // calls adopt the existing nodes in place (handlers/effects attach to the server
          // DOM); claimed nodes are already positioned, so nothing is inserted.
          const child = Array.isArray(children) && children.length === 1 ? children[0] : children;
          let adopted!: Node;
          adoptClaimFrame(
            parent,
            hctx.existingNodes[0] ?? null,
            () => {
              adopted = resolveNode(child, parent, childNamespaceOf(parent));
            },
            hctx.claimBound ?? null,
          );
          current = adopted;
          if (appear) {
            const appearClass = isString(appear) ? appear : enter;
            if (appearClass && current instanceof Element) {
              current.classList.add(appearClass);
            }
          }
          return;
        }

        if (current) return;

        // A single-element children array unwraps to the element (the babel plugin's
        // compiled component-children convention) — resolveNode maps
        // arrays to a fragment, and a fragment `current` silently skips every
        // `instanceof Element` branch below (enter/appear classes, leave removal).
        const child = Array.isArray(children) && children.length === 1 ? children[0] : children;
        current = resolveNode(child, parent, childNamespaceOf(parent));
        anchor.parentNode?.insertBefore(current, anchor);

        if (isFirst && appear) {
          const appearClass = isString(appear) ? appear : enter;
          if (appearClass && current instanceof Element) {
            current.classList.add(appearClass);
          }
        } else if (!isFirst && enter && current instanceof Element) {
          current.classList.add(enter);
        }
      } else {
        if (!current || leaveTimer) return;

        if (leave && current instanceof Element) {
          current.classList.add(leave);
          const node = current;
          leaveTimer = setTimeout(() => {
            cleanupSubtree(node);
            node.parentNode?.removeChild(node);
            if (current === node) current = null;
            leaveTimer = null;
          }, duration + 50);
        } else {
          cleanupSubtree(current);
          current.parentNode?.removeChild(current);
          current = null;
        }
      }
    });

    // anchor-owned lifecycle (see ForEach): the anchor carries the effect + this disposer, so a
    // reactive getter switching away removes the current node alongside disposing the effect
    getState(anchor).transitionCleanup = () => {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
      if (current) {
        cleanupSubtree(current);
        current.parentNode?.removeChild(current);
        current = null;
      }
    };
  }) as JSX.Element;

  fn.isDynamic = true;
  fn.ssr = { kind: "transition", props };
  return fn;
}
