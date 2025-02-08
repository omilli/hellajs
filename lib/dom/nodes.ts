import { HellaElement, HNodeChild } from "./types";
import { render } from "./render";
import { isFalsy, isFunction, isPrimitive, isRecord } from "../global";
import { replaceEvents } from "./events";

// Processes an elements child nodes
export function processChildren(
  domElement: HTMLElement | DocumentFragment,
  hellaElement: HellaElement
): void {
  const { content } = hellaElement;
  const rootSelector = hellaElement.root;
  const childArray = Array.isArray(content) ? content : [content];
  childArray.filter(Boolean).forEach((child) => {
    let childNode = child as HellaElement;
    isRecord(childNode) && (childNode.root = rootSelector);
    processChild(childNode, domElement, rootSelector!);
  });
}

// Recursively diffs and patches dom nodes
export function diffNodes(
  domElement: HTMLElement | DocumentFragment,
  currentNode: Node,
  newNode: Node,
  rootSelector: string
): void {
  const isElement = isElementNode(currentNode) && isElementNode(newNode);
  const isText = isTextNode(currentNode) && isTextNode(newNode);
  const shouldReplace = shouldReplaceNodes(
    currentNode,
    newNode,
    isElement,
    isText
  );

  switch (true) {
    case shouldReplace && !isText:
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
    case isText && currentNode.textContent !== newNode.textContent:
      currentNode.textContent = newNode.textContent;
      return;
  }
}

// Processes a child node based on their type
function processChild(
  child: HNodeChild | (() => HNodeChild | HNodeChild[]),
  domElement: HTMLElement | DocumentFragment,
  rootSelector: string
): void {
  const isReactive = isFunction(child);
  const element = child as HellaElement;
  const isFragmentType = !isReactive && element && !element.tag;

  switch (true) {
    case isFalsy(child):
      return;
    case isReactive:
      functionChild(
        child as () => HNodeChild | HNodeChild[],
        domElement,
        rootSelector
      );
      break;
    case isPrimitive(child):
      domElement.appendChild(textNode(String(child)));
      break;
    case Boolean(isFragmentType):
      processChildren(domElement, element);
      break;
    default:
      const rendered = render(element);
      rendered && domElement.appendChild(rendered as unknown as Node);
  }
}

// Updates dom nodes when reactive state changes
function functionChild(
  child: () => HNodeChild | HNodeChild[],
  domElement: HTMLElement | DocumentFragment,
  rootSelector: string
): void {
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
    }
  });

  processedNodes.length &&
    !domElement.firstChild &&
    domElement.appendChild(fragment);
}

// Updates container content by diffing node arrays
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
  const currentStyle = (currentNode as HTMLElement).style.cssText;

  currentAttrs.forEach((name) => {
    const shouldPreserve =
      name === "class" || (name === "style" && currentStyle);
    !newNode.hasAttribute(name) &&
      !shouldPreserve &&
      currentNode.removeAttribute(name);
  });

  nextAttrs.forEach((attr) => {
    if (attr.name === "class") {
      const nextClasses = attr.value.split(" ");
      const newClasses = [...new Set([...preserveClasses, ...nextClasses])];
      currentNode.className = newClasses.join(" ").trim();
    } else if (attr.name === "style") {
      const element = currentNode as HTMLElement;
      element.style.cssText = `${currentStyle}; ${attr.value}`.trim();
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

// Determines if nodes need to be replaced
function shouldReplaceNodes(
  currentNode: Node,
  newNode: Node,
  isElement: boolean,
  isText: boolean
): boolean {
  const notMatchingType = currentNode.nodeType !== newNode.nodeType;
  const notMatchingTag =
    isElement &&
    (currentNode as Element).tagName !== (newNode as Element).tagName;
  const notMatchingText =
    isText && currentNode.textContent !== newNode.textContent;
  return notMatchingType || notMatchingTag || notMatchingText;
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
