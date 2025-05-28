import { route } from "./state";
import { effect } from "../reactive";
import { isVNode, resolveNode } from "../dom/mount";
import { cleanNodeRegistry } from "../dom/registry";
import { navigate } from "./router";
import type { HandlerWithParams } from "../types";

export function routerOutlet(baseRoute: string): Node {
  const placeholder = document.createComment("router-outlet");
  let currentNode: Node | null = null;
  let cleanup: (() => void) | null = null;

  effect(() => {
    const r = route();
    const handler = r.handler;
    let result: any;

    if (currentNode && currentNode.parentNode) {
      cleanNodeRegistry(currentNode);
      currentNode.parentNode.replaceChild(placeholder, currentNode);
      currentNode = null;
    }
    if (cleanup) {
      cleanup();
      cleanup = null;
    }

    if (!handler) return;

    if (Object.keys(r.params).length > 0) {
      result = (handler as HandlerWithParams)(r.params, r.query);
    } else {
      result = handler(r.query);
    }

    const render = (resolved: any) => {
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

    if (result && typeof result.then === "function") {
      result.then(render);
    } else {
      render(result);
    }
  });

  navigate(baseRoute, {}, {}, { replace: true });

  return placeholder;
}