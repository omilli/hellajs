import { effect } from "../reactive";
import { HNode, HNodeChild } from "../types";
import { render } from "./render";
import { componentRegistry, debounceRaf, isRecord } from "../global";
import { cleanupDelegatedEvents, replaceEvents } from "./events";

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

function updateContainer(
  container: HTMLElement,
  newNodes: Node[],
  root: string
): void {
  const currentNodes = Array.from(container.childNodes);
  const maxLength = Math.max(currentNodes.length, newNodes.length);
  for (let i = 0; i < maxLength; i++) {
    handleNodeUpdate(container, currentNodes[i], newNodes[i], root);
  }
}

function processFunctionChildResult(
  node: HNodeChild,
  temp: HTMLElement,
  root: string
): Node | null {
  if (node == null) return null;
  processChild(node, temp, root);
  return temp.firstChild;
}

function handleNodeUpdate(
  container: HTMLElement,
  currentNode: Node | undefined,
  newNode: Node | undefined,
  root: string
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
      replaceEvents(currentNode.parentElement!, newNode.parentElement!, root);
      container.replaceChild(newNode, currentNode);
      return;
    }

    if (isElementNode(currentNode) && isElementNode(newNode)) {
      updateAttributes(currentNode, newNode);
      updateContainer(
        currentNode as HTMLElement,
        Array.from(newNode.childNodes),
        root
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

    replaceEvents(currentNode.parentElement!, newNode.parentElement!, root);
  }
}

function compareNodes(current: Node, next: Node): boolean {
  if (current.nodeType !== next.nodeType) return false;
  if (isTextNode(current) && isTextNode(next)) {
    return current.textContent === next.textContent;
  }
  if (isElementNode(current) && isElementNode(next)) {
    return current.tagName === next.tagName;
  }
  return false;
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

function isElementNode(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
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
    const fragment = document.createDocumentFragment();
    const processedNodes: Node[] = [];
    nodes.forEach((node) => {
      isRecord(node) && ((node as HNode).props.root = root);
      const temp = document.createElement("div");
      const processedNode = processFunctionChildResult(node, temp, root);
      if (processedNode) {
        fragment.appendChild(processedNode);
        processedNodes.push(processedNode);
        const components = componentRegistry(root);
        components.nodeEffects.add(cleanup);
      }
    });
    updateContainer(container, processedNodes, root);
    processedNodes.length &&
      !container.firstChild &&
      container.appendChild(fragment);
    debouncedCleanup(root);
  });
}
