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
  domElement: HTMLElement,
  hellaElement: HellaElement
): void {
  const { children } = hellaElement;
  let rootSelector = hellaElement.root || hellaElement?.mount;
  const childArray = Array.isArray(children) ? children : [children];
  childArray.forEach((child) => {
    if (!child) return;
    let childNode = child as HellaElement;
    isRecord(childNode) && (childNode.root = rootSelector);
    processChild(childNode, domElement, rootSelector!);
  });
}

// Processes a child node based on their type
function processChild(
  child: HNodeChild | (() => HNodeChild | HNodeChild[]),
  domElement: HTMLElement | DocumentFragment,
  rootSelector: string
): void {
  switch (true) {
    case isFalsy(child):
      return;
    case isFunction(child):
      functionChild(child, domElement, rootSelector);
      break;
    case isPrimitive(child):
      domElement.appendChild(textNode(String(child)));
      break;
    default:
      const mountedNode = render(child!);
      mountedNode && domElement.appendChild(mountedNode);
  }
}

// Updates dom nodes when reactive state changes
function functionChild(
  child: () => HNodeChild | HNodeChild[],
  domElement: HTMLElement | DocumentFragment,
  rootSelector: string
): void {
  const debouncedCleanup = debounceRaf(cleanupDelegatedEvents);
  const cleanup = effect(() => {
    const result = child();
    const nodes = Array.isArray(result) ? result : [result];
    const fragment = document.createDocumentFragment();
    const processedNodes: Node[] = [];
    nodes.forEach((node) => {
      isRecord(node) && ((node as HellaElement).root = rootSelector);
      const temp = document.createDocumentFragment();
      processChild(node, temp, rootSelector);
      const processedNode = temp.firstChild;
      if (processedNode) {
        fragment.appendChild(processedNode);
        processedNodes.push(processedNode);
        const components = componentRegistry(rootSelector);
        components.nodeEffects.add(cleanup);
      }
    });
    updateParentNode(domElement, processedNodes, rootSelector);
    processedNodes.length &&
      !domElement.firstChild &&
      domElement.appendChild(fragment);
    debouncedCleanup(rootSelector);
  });
}

// Updates container children by diffing node arrays
function updateParentNode(
  domElement: HTMLElement | DocumentFragment,
  newNodes: Node[],
  rootSelector: string
): void {
  const currentNodes = Array.from(domElement.childNodes);
  const maxLength = Math.max(currentNodes.length, newNodes.length);
  for (let i = 0; i < maxLength; i++) {
    updateNode(domElement, currentNodes[i], newNodes[i], rootSelector);
  }
}

// Updates domElement attributes and preserves framework classes
function updateAttributes(currentNode: Element, newNode: Element): void {
  const currentAttrs = new Set(
    Array.from(currentNode.attributes).map((a) => a.name)
  );
  const nextAttrs = Array.from(newNode.attributes);
  const currentClasses = currentNode.className.split(" ");
  const preserveClasses = currentClasses.filter((cls) => cls.startsWith("h-"));

  currentAttrs.forEach((name) => {
    !newNode.hasAttribute(name) &&
      name !== "class" &&
      currentNode.removeAttribute(name);
  });

  nextAttrs.forEach((attr) => {
    if (attr.name === "class") {
      const nextClasses = attr.value.split(" ");
      const newClasses = [...new Set([...preserveClasses, ...nextClasses])];
      currentNode.className = newClasses.join(" ");
    } else if (currentNode.getAttribute(attr.name) !== attr.value) {
      currentNode.setAttribute(attr.name, attr.value);
    }
  });
}

// Compares and updates nodes during dom diffing
function updateNode(
  domElement: HTMLElement | DocumentFragment,
  currentNode: Node,
  newNode: Node,
  rootSelector: string
): void {
  const noNodes = Boolean(!currentNode && !newNode);
  const noNewNode = Boolean(!newNode && currentNode);
  const noCurrentNode = Boolean(!currentNode && newNode);
  const hasNodes = Boolean(currentNode && newNode);
  switch (true) {
    case noNodes:
      return;
    case noNewNode:
      domElement.removeChild(currentNode);
      break;
    case noCurrentNode:
      domElement.appendChild(newNode);
      break;
    case hasNodes:
      diffNodes(domElement, currentNode, newNode, rootSelector);
      replaceEvents(
        currentNode.parentElement!,
        newNode.parentElement!,
        rootSelector
      );
  }
}

// Recursively diffs and patches dom nodes
function diffNodes(
  domElement: HTMLElement | DocumentFragment,
  currentNode: Node,
  newNode: Node,
  rootSelector: string
): void {
  const isElement = isElementNode(currentNode) && isElementNode(newNode);
  const isText = isTextNode(currentNode) && isTextNode(newNode);
  const replaceNode = shouldReplaceNodes(
    currentNode,
    newNode,
    isElement,
    isText
  );
  switch (true) {
    case replaceNode:
      replaceEvents(
        currentNode.parentElement!,
        newNode.parentElement!,
        rootSelector
      );
      domElement.replaceChild(newNode, currentNode);
      return;
    case isElement:
      updateAttributes(currentNode, newNode);
      updateParentNode(
        currentNode,
        Array.from(newNode.childNodes),
        rootSelector
      );
      return;
    case isText:
      currentNode.textContent = newNode.textContent;
      return;
  }
}

// Determines if nodes need to be replaced
function shouldReplaceNodes(
  currentNode: Node,
  newNode: Node,
  isElement: boolean,
  isText: boolean
): boolean {
  const notMatching = currentNode.nodeType !== newNode.nodeType;
  switch (true) {
    case notMatching:
      return true;
    case isElement:
      return (currentNode as Element).tagName !== (newNode as Element).tagName;
    case isText:
      return currentNode.textContent !== newNode.textContent;
    default:
      return true;
  }
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
