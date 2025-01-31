import { effect } from "../reactive";
import { HNode, HNodeChild } from "../types";
import { render } from "./render";
import {
  componentRegistry,
  debounceRaf,
  isFalsy,
  isFunction,
  isPrimitive,
  isRecord,
} from "../global";
import { cleanupDelegatedEvents, replaceEvents } from "./events";

const textNodeTemplate = document.createTextNode("");

export function processChild(
  child: HNodeChild | (() => HNodeChild | HNodeChild[]),
  container: HTMLElement,
  root: string
): void {
  switch (true) {
    case isFalsy(child):
      return;
    case isFunction(child):
      handleFunctionChild(child, container, root);
      break;
    case isPrimitive(child):
      container.appendChild(textNode(String(child)));
      break;
    default:
      const mountedNode = render(child!);
      mountedNode && container.appendChild(mountedNode);
  }
}

function processFunctionChildResult(
  node: HNodeChild,
  temp: HTMLElement,
  root: string
): Node | null {
  if (node === null) return null;
  processChild(node, temp, root);
  return temp.firstChild;
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

function handleNodeUpdate(
  container: HTMLElement,
  current: Node,
  next: Node,
  root: string
): void {
  const noNodes = Boolean(!current && !next);
  const noNewNode = Boolean(!next && current);
  const noCurrentNode = Boolean(!current && next);
  const hasNodes = Boolean(current && next);
  switch (true) {
    case noNodes:
      return;
    case noNewNode:
      container.removeChild(current);
      break;
    case noCurrentNode:
      container.appendChild(next);
      break;
    case hasNodes:
      diffNodes(container, current, next, root);
      replaceEvents(current.parentElement!, next.parentElement!, root);
  }
}

function diffNodes(
  container: HTMLElement,
  current: Node,
  next: Node,
  root: string
): void {
  const isElement = isElementNode(current) && isElementNode(next);
  const isText = isTextNode(current) && isTextNode(next);
  const replaceNode = replaceNodes(current, next, isElement, isText);
  switch (true) {
    case replaceNode:
      replaceEvents(current.parentElement!, next.parentElement!, root);
      container.replaceChild(next, current);
      return;
    case isElement:
      updateAttributes(current, next);
      updateContainer(current, Array.from(next.childNodes), root);
      return;
    case isText:
      current.textContent = next.textContent;
      return;
  }
}

function replaceNodes(
  current: Node,
  next: Node,
  isElement: boolean,
  isText: boolean
): boolean {
  const notMatching = current.nodeType !== next.nodeType;
  switch (true) {
    case notMatching:
      return true;
    case isElement:
      return (current as Element).tagName !== (next as Element).tagName;
    case isText:
      return current.textContent !== next.textContent;
    default:
      return true;
  }
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

function updateAttributes(current: Element, next: Element): void {
  const currentAttrs = new Set(
    Array.from(current.attributes).map((a) => a.name)
  );
  const nextAttrs = Array.from(next.attributes);
  const currentClasses = current.className.split(" ");
  const preserveClasses = currentClasses.filter((cls) => cls.startsWith("h-"));

  currentAttrs.forEach((name) => {
    !next.hasAttribute(name) &&
      name !== "class" &&
      current.removeAttribute(name);
  });

  nextAttrs.forEach((attr) => {
    if (attr.name === "class") {
      const nextClasses = attr.value.split(" ");
      const newClasses = [...new Set([...preserveClasses, ...nextClasses])];
      current.className = newClasses.join(" ");
    } else if (current.getAttribute(attr.name) !== attr.value) {
      current.setAttribute(attr.name, attr.value);
    }
  });
}

function textNode(text: string | number): Text {
  const node = textNodeTemplate.cloneNode() as Text;
  node.textContent = String(text);
  return node;
}

function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

function isElementNode(node: Node): node is HTMLElement {
  return node.nodeType === Node.ELEMENT_NODE;
}
