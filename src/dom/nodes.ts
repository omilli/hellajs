import { effect } from "../reactive";
import { HellaElement, HNodeChild } from "./types";
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

// Processes an elements child nodes
export function processChildren(
  element: HTMLElement,
  hnode: HellaElement
): void {
  const { children } = hnode;
  let root = hnode.root || hnode?.mount;
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (!child) return;
    let childNode = child as HellaElement;
    isRecord(childNode) && (childNode.root = root);
    processChild(childNode, element, root!);
  });
}

// Processes a child node based on their type
function processChild(
  child: HNodeChild | (() => HNodeChild | HNodeChild[]),
  element: HTMLElement | DocumentFragment,
  root: string
): void {
  switch (true) {
    case isFalsy(child):
      return;
    case isFunction(child):
      handleFunctionChild(child, element, root);
      break;
    case isPrimitive(child):
      element.appendChild(textNode(String(child)));
      break;
    default:
      const mountedNode = render(child!);
      mountedNode && element.appendChild(mountedNode);
  }
}

// Updates dom nodes when reactive state changes
function handleFunctionChild(
  child: () => HNodeChild | HNodeChild[],
  element: HTMLElement | DocumentFragment,
  root: string
): void {
  const debouncedCleanup = debounceRaf(cleanupDelegatedEvents);
  const cleanup = effect(() => {
    const result = child();
    const nodes = Array.isArray(result) ? result : [result];
    const fragment = document.createDocumentFragment();
    const processedNodes: Node[] = [];
    nodes.forEach((node) => {
      isRecord(node) && ((node as HellaElement).root = root);
      const temp = document.createDocumentFragment();
      processChild(node, temp, root);
      const processedNode = temp.firstChild;
      if (processedNode) {
        fragment.appendChild(processedNode);
        processedNodes.push(processedNode);
        const components = componentRegistry(root);
        components.nodeEffects.add(cleanup);
      }
    });
    updateContainer(element, processedNodes, root);
    processedNodes.length &&
      !element.firstChild &&
      element.appendChild(fragment);
    debouncedCleanup(root);
  });
}

// Compares and updates nodes during dom diffing
function handleNodeUpdate(
  element: HTMLElement | DocumentFragment,
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
      element.removeChild(current);
      break;
    case noCurrentNode:
      element.appendChild(next);
      break;
    case hasNodes:
      diffNodes(element, current, next, root);
      replaceEvents(current.parentElement!, next.parentElement!, root);
  }
}

// Recursively diffs and patches dom nodes
function diffNodes(
  element: HTMLElement | DocumentFragment,
  current: Node,
  next: Node,
  root: string
): void {
  const isElement = isElementNode(current) && isElementNode(next);
  const isText = isTextNode(current) && isTextNode(next);
  const replaceNode = shouldReplaceNodes(current, next, isElement, isText);
  switch (true) {
    case replaceNode:
      replaceEvents(current.parentElement!, next.parentElement!, root);
      element.replaceChild(next, current);
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

// Determines if nodes need to be replaced
function shouldReplaceNodes(
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

// Updates container children by diffing node arrays
function updateContainer(
  element: HTMLElement | DocumentFragment,
  newNodes: Node[],
  root: string
): void {
  const currentNodes = Array.from(element.childNodes);
  const maxLength = Math.max(currentNodes.length, newNodes.length);
  for (let i = 0; i < maxLength; i++) {
    handleNodeUpdate(element, currentNodes[i], newNodes[i], root);
  }
}

// Updates element attributes and preserves framework classes
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

// Returns a clone of a text node
const textNodeTemplate = document.createTextNode("");
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
