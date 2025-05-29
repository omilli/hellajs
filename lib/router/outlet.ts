import { route } from "./state";
import { effect, signal } from "../reactive";
import { isVNode, resolveNode } from "../dom/mount";
import { cleanNodeRegistry } from "../dom/registry";

export const outletResult = signal<unknown>(null);

export function routerOutlet(): Node {
  const placeholder = document.createComment("router-outlet");
  let currentNode: Node | null = null;
  let cleanup: (() => void) | null = null;
  let currentPromise: Promise<unknown> | null = null;

  effect(() => {
    const result = outletResult();

    if (currentNode && currentNode.parentNode) {
      cleanNodeRegistry(currentNode);
      currentNode.parentNode.replaceChild(placeholder, currentNode);
      currentNode = null;
    }

    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    const render = (resolved: unknown) => {
      if (!resolved) return;
      const node =
        isVNode(resolved) || resolved instanceof Node
          ? resolveNode(resolved)
          : document.createTextNode(String(resolved));
      if (placeholder.parentNode) {
        placeholder.parentNode.replaceChild(node, placeholder);
        currentNode = node;
      }
    };

    if (result && typeof (result as { then?: unknown }).then === "function") {
      const promise = result as Promise<unknown>;
      currentPromise = promise;

      promise
        .then((resolved) => {
          if (currentPromise === promise) {
            render(resolved);
          }
        })
        .catch((error) => {
          if (currentPromise === promise) {
            console.error("Route loading error:", error);
            render("Error loading route");
          }
        });
    } else {
      currentPromise = null;
      render(result);
    }
  });

  return placeholder;
}