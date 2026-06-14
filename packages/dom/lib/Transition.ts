import { resolveValue } from "./internal/utils";
import { resolveNode } from "./internal/render";
import { cleanupSubtree } from "./internal/cleanup";
import { registry } from "./registry";
import { getState } from "./internal/state";
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
    const start = document.createComment("transition-start");
    const end = document.createComment("transition-end");
    parent.appendChild(start);
    parent.appendChild(end);

    let current: Node | null = null;
    let leaveTimer: ReturnType<typeof setTimeout> | null = null;
    let isFirstRender = true;

    registry.addEffect(parent, () => {
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
        if (current) return;

        current = resolveNode(children, parent);
        start.parentNode?.insertBefore(current, end);

        if (isFirst && appear) {
          const appearClass = typeof appear === "string" ? appear : enter;
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

    getState(parent).transitionCleanup = () => {
      if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
    };
  }) as JSX.Element;

  fn.isDynamic = true;
  return fn;
}
