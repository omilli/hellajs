import { effect, isSignal } from "../reactive";
import { HNodeChild, Signal } from "../types";
import { render } from "./render";

const textNodeTemplate = document.createTextNode("");

export function processChild(
  child: HNodeChild | (() => HNodeChild | HNodeChild[]),
  container: HTMLElement
): void {
  if (child == null) return;

  if (typeof child === "function" && !isSignal(child)) {
    handleFunctionChild(child, container);
  } else if (typeof child === "string" || typeof child === "number") {
    container.appendChild(textNode(child));
  } else if (isSignal(child)) {
    handleSignalChild(child as Signal<any>, container);
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

function updateAttributes(current: Element, next: Element): void {
  const currentAttrs = new Set(
    Array.from(current.attributes).map((a) => a.name)
  );
  const nextAttrs = Array.from(next.attributes);

  currentAttrs.forEach((name) => {
    if (!next.hasAttribute(name)) current.removeAttribute(name);
  });

  nextAttrs.forEach((attr) => {
    if (current.getAttribute(attr.name) !== attr.value) {
      current.setAttribute(attr.name, attr.value);
    }
  });
}

function updateContainer(container: HTMLElement, newNodes: Node[]): void {
  const currentNodes = Array.from(container.childNodes);

  const maxLength = Math.max(currentNodes.length, newNodes.length);
  for (let i = 0; i < maxLength; i++) {
    handleNodeUpdate(container, currentNodes[i], newNodes[i]);
  }
}

function processFunctionChildResult(
  node: HNodeChild,
  temp: HTMLElement
): Node | null {
  if (node == null) return null;
  processChild(node, temp);
  return temp.firstChild;
}

function handleNodeUpdate(
  container: HTMLElement,
  currentNode: Node | undefined,
  newNode: Node | undefined
): void {
  if (!currentNode && !newNode) return;
  if (!newNode && currentNode) {
    container.removeChild(currentNode);
    return;
  }
  if (!currentNode && newNode) {
    container.appendChild(newNode);
    return;
  }

  if (currentNode && newNode) {
    if (!compareNodes(currentNode, newNode)) {
      container.replaceChild(newNode, currentNode);
      return;
    }

    if (isElementNode(currentNode) && isElementNode(newNode)) {
      updateAttributes(currentNode, newNode);
      updateContainer(
        currentNode as HTMLElement,
        Array.from(newNode.childNodes)
      );
      return;
    }

    if (
      isTextNode(currentNode) &&
      isTextNode(newNode) &&
      currentNode.textContent !== newNode.textContent
    ) {
      currentNode.textContent = newNode.textContent;
    }
  }
}

function handleFunctionChild(
  child: () => HNodeChild | HNodeChild[],
  container: HTMLElement
): void {
  effect(() => {
    const result = child();
    const nodes = Array.isArray(result) ? result : [result];
    const fragment = document.createDocumentFragment();
    const processedNodes: Node[] = [];

    nodes.forEach((node) => {
      const temp = document.createElement("div");
      const processedNode = processFunctionChildResult(node, temp);
      if (processedNode) {
        fragment.appendChild(processedNode);
        processedNodes.push(processedNode);
      }
    });

    updateContainer(container, processedNodes);
    if (processedNodes.length && !container.firstChild) {
      container.appendChild(fragment);
    }
  });
}

function handleSignalChild(signal: Signal<any>, container: HTMLElement): void {
  effect(() => {
    const node = textNode(signal());
    updateContainer(container, [node]);
  });
}

function compareTextNodes(current: Text, next: Text): boolean {
  return current.textContent === next.textContent;
}

function compareElementNodes(current: Element, next: Element): boolean {
  return current.tagName === next.tagName;
}

function compareNodes(current: Node, next: Node): boolean {
  if (current.nodeType !== next.nodeType) return false;

  if (isTextNode(current) && isTextNode(next)) {
    return compareTextNodes(current, next);
  }

  if (isElementNode(current) && isElementNode(next)) {
    return compareElementNodes(current, next);
  }

  return false;
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}
