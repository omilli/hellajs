import { effect, type Signal } from "@hellajs/core";
import { isFunction, isText, resolveNode } from "./mount";
import type { ForEach, VNodeValue } from "./types/nodes";


export function forEach<T>(
  each: T[] | Signal<T[]> | (() => T[]),
  arg2: ForEach<T> | keyof T,
  arg3?: ForEach<T>
) {
  const use = getForEachUse(arg2, arg3);
  const key = getForEachKey(arg2);

  const fn = function (parent: Node) {
    let nodes: Node[][] = [];
    let keys: unknown[] = [];
    const placeholder = document.createComment("forEach-placeholder");

    const clearNodes = () => {
      parent.textContent = "";
      nodes = [];
      keys = [];
      parent.appendChild(placeholder);
    };

    effect(() => {
      const arr = isFunction(each) ? each() : each || [];

      if (arr.length === 0) {
        clearNodes();
        return;
      }

      const newKeys = arr.map((item, i) => key ? key(item, i) : i);

      const oldKeyToIdx = new Map<unknown, number>();
      for (let i = 0; i < keys.length; i++) {
        oldKeyToIdx.set(keys[i], i);
      }

      const newNodes = buildNewNodes(arr, newKeys, oldKeyToIdx, nodes, use, parent);

      removeUnusedNodes(nodes, keys, newKeys, parent);

      moveAndInsertNodes(newNodes, nodes, parent);

      nodes = newNodes;
      keys = newKeys;
    });
  };

  (fn as unknown as { arity: boolean }).arity = true;

  return fn;
}

// Only allow string or undefined for key
function getForEachKey<T>(arg2: ForEach<T> | keyof T): ForEach<T> | undefined {
  if (isText(arg2)) {
    const keyProp = arg2;
    return (item, _i) => item && item[keyProp as keyof T];
  }
  // fallback: use id if present, else item value
  return (item: any, i) =>
    (typeof item === "object" && item !== null && "id" in item)
      ? item.id
      : item;
}

function getForEachUse<T>(arg2: ForEach<T> | keyof T, arg3?: ForEach<T>): ForEach<T> {
  if (isText(arg2)) {
    return arg3!;
  } else {
    return arg2 as ForEach<T>;
  }
}

function createNode(child: VNodeValue, parent: Node): Node[] {
  if (isFunction(child)) {
    const placeholder = document.createComment("forEach-placeholder");
    let node: Node = placeholder;
    effect(() => {
      const value = child();
      const newNode = resolveNode(value as VNodeValue);
      if (node.parentNode === parent) {
        parent.replaceChild(newNode, node);
      }
      node = newNode;
    });
    return [node];
  }
  const node = resolveNode(child);
  if (node instanceof DocumentFragment) {
    const inserted: Node[] = [];
    while (node.firstChild) {
      const childNode = node.firstChild;
      parent.appendChild(childNode);
      inserted.push(childNode);
    }
    return inserted;
  }
  return [node];
}

function removeUnusedNodes(nodes: Node[][], keys: unknown[], newKeys: unknown[], parent: Node) {
  for (let i = 0; i < nodes.length; i++) {
    const k = keys[i];
    if (!newKeys.includes(k)) {
      for (const node of nodes[i]) {
        if (node.parentNode === parent) parent.removeChild(node);
      }
    }
  }
}

function buildNewNodes<T>(
  arr: T[],
  newKeys: unknown[],
  oldKeyToIdx: Map<unknown, number>,
  nodes: Node[][],
  use: ForEach<T>,
  parent: Node
): Node[][] {
  const newNodes: Node[][] = [];
  for (let i = 0; i < arr.length; i++) {
    const k = newKeys[i];
    let nodeArr: Node[] | undefined;
    if (oldKeyToIdx.has(k)) {
      nodeArr = nodes[oldKeyToIdx.get(k)!];
    } else {
      nodeArr = createNode(use(arr[i], i), parent);
    }
    newNodes.push(nodeArr!);
  }
  return newNodes;
}

function moveAndInsertNodes(newNodes: Node[][], nodes: Node[][], parent: Node) {
  const newIdxToOldIdx = newNodes.map(nArr => {
    const first = nArr[0];
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i][0] === first) return i;
    }
    return -1;
  });
  const lisIdx = computeLIS(newIdxToOldIdx);

  let lisPos = lisIdx.length - 1;
  let ref: Node | null = null;
  for (let i = newNodes.length - 1; i >= 0; i--) {
    const nodeArr = newNodes[i];
    if (newIdxToOldIdx[i] === -1 || lisIdx[lisPos] !== i) {
      for (let j = nodeArr.length - 1; j >= 0; j--) {
        const node = nodeArr[j];
        if (node.nextSibling !== ref || node.parentNode !== parent) {
          parent.insertBefore(node, ref);
        }
        ref = node;
      }
    } else {
      ref = nodeArr[0];
      lisPos--;
    }
  }
}

function computeLIS(a: number[]) {
  const p = a.slice();
  const result: number[] = [];
  let u: number, v: number;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === -1) continue;
    if (result.length === 0 || a[result[result.length - 1]] < a[i]) {
      p[i] = result.length ? result[result.length - 1] : -1;
      result.push(i);
      continue;
    }
    u = 0;
    v = result.length - 1;
    while (u < v) {
      const c = ((u + v) / 2) | 0;
      if (a[result[c]] < a[i]) u = c + 1;
      else v = c;
    }
    if (a[i] < a[result[u]]) {
      if (u > 0) p[i] = result[u - 1];
      result[u] = i;
    }
  }
  u = result.length;
  v = result[result.length - 1];
  while (u-- > 0) {
    result[u] = v;
    v = p[v];
  }
  return result;
}
