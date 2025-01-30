import { effect } from "../reactive";
import { HNode, HNodeChild } from "../types";
import { render } from "./render";
import { componentRegistry, debounceRaf, isRecord } from "../global";
import { cleanupDelegatedEvents } from "./events";

const textNodeTemplate = document.createTextNode("");

export function processChild(
  child: HNodeChild | (() => HNodeChild | HNodeChild[]),
  container: HTMLElement,
  root: string
): void {
  if (child == null) return;
  if (typeof child === "function") {
    handleFunctionChild(child, container, root);
  } else if (typeof child === "string" || typeof child === "number") {
    container.appendChild(textNode(child));
  } else if (child) {
    const mountedNode = render(child);
    if (mountedNode) container.appendChild(mountedNode);
  }
}

export function textNode(text: string | number): Text {
  const node = textNodeTemplate.cloneNode() as Text;
  node.textContent = String(text);
  return node;
}

function handleFunctionChild(
  child: () => HNodeChild | HNodeChild[],
  container: HTMLElement,
  root: string
): void {
  const debouncedCleanup = debounceRaf(cleanupDelegatedEvents);
  const cleanup = effect(() => {
    const result = child();
    const nodes = Array.isArray(result) ? result : [result];
    container.textContent = "";

    const fragment = document.createDocumentFragment();
    nodes.forEach((node) => {
      if (isRecord(node)) {
        (node as HNode).props.root = root;
      }
      if (node != null) {
        const temp = document.createElement("div");
        processChild(node, temp, root);
        if (temp.firstChild) {
          fragment.appendChild(temp.firstChild);
          const component = componentRegistry(root);
          component.nodeEffects.add(cleanup);
        }
      }
    });

    container.appendChild(fragment);
    debouncedCleanup(root);
  });
}
