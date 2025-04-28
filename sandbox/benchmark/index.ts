// --- Library Code (Modified rdom) ---

export interface VNode {
  tag?: string;
  props: Record<string, unknown>;
  children: (VNode | string | (() => unknown))[];
}

export interface CachedNode {
  domNode: Node;
}

export interface ReactiveObject<T extends object = Record<string, unknown>> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  cleanup(): void;
}

export interface ListItemState<T extends object = Record<string, unknown>> {
  node: Node;
  reactiveObj: ReactiveObject<T>;
  effectCleanup?: () => void;
  vNode: VNode;
}

export interface Signal<T> {
  get: () => T;
  set: (value: T) => void;
  cleanup: () => void;
}

export type HtmlTagFactory = (
  props?: Record<string, unknown>,
  ...children: (VNode | string | (() => unknown))[]
) => VNode;

export function createSignal<T>(initial: T): Signal<T> {
  const subscribers = new Set<() => void>();
  let value = initial;
  const get = () => {
    const current = getCurrentObserver();
    if (current) subscribers.add(current);
    return value;
  };
  const set = (newValue: T) => {
    if (value !== newValue) {
      value = newValue;
      for (const sub of subscribers) sub();
    }
  };
  const cleanup = () => {
    subscribers.clear();
  };
  return { get, set, cleanup };
}

export function createStore<T extends object>(initial: T): ReactiveObject<T> {
  const signals = new Map<keyof T, Signal<T[keyof T]>>();
  for (const key in initial) {
    signals.set(key, createSignal(initial[key]) as unknown as Signal<T[keyof T]>);
  }
  return {
    get: <K extends keyof T>(key: K) => signals.get(key)!.get() as T[K],
    set: <K extends keyof T>(key: K, value: T[K]) => signals.get(key)!.set(value),
    cleanup: () => {
      signals.forEach(signal => signal.cleanup());
      signals.clear();
    },
  };
}

let currentObserver: (() => void) | null = null;
function getCurrentObserver(): (() => void) | null {
  return currentObserver;
}

export function createEffect(fn: () => void): () => void {
  let execute: (() => void) | null = () => {
    currentObserver = execute;
    try {
      fn();
    } catch (e) {
      console.error('Effect error:', e);
    }
    currentObserver = null;
  };
  execute();
  return () => {
    execute = null;
  };
}

function camelToKebabCase(camel: string): string {
  return camel.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
}

function h(tag: string, propsOrChild: Record<string, unknown> | VNode | string | (() => unknown) = {}, ...children: (VNode | string | (() => unknown))[]): VNode {
  // Detect if propsOrChild is a props object (plain object, not VNode, string, or function)
  const isPropsObject =
    propsOrChild &&
    typeof propsOrChild === 'object' &&
    !Array.isArray(propsOrChild) &&
    !(propsOrChild instanceof Function) &&
    !('tag' in propsOrChild && 'props' in propsOrChild && 'children' in propsOrChild);

  // If propsOrChild is not props, treat it as a child and set props to {}
  const props = isPropsObject ? (propsOrChild as Record<string, unknown>) : {};
  const childArgs = isPropsObject ? children : [propsOrChild, ...children];

  // Flatten children and ensure correct types
  const normalizedChildren = childArgs
    .flat(Infinity)
    .filter(child => child !== undefined && child !== null)
    .map(child => (typeof child === 'string' || typeof child === 'number' ? String(child) : child)) as (VNode | string | (() => unknown))[];

  return { tag, props, children: normalizedChildren };
}

export const html = new Proxy<Record<string, HtmlTagFactory>>(
  {},
  {
    get(_, tag: string): HtmlTagFactory {
      return (propsOrChild, ...children) => h(camelToKebabCase(tag), propsOrChild, ...children);
    },
  }
);

const vdomObjectCache = new WeakMap<VNode | (() => unknown), CachedNode>();
const vdomStringCache = new Map<string, CachedNode>();
const reactiveBindings = new WeakMap<() => unknown, { keyToItem: Map<string, ListItemState>; lastKeys: string[] }>();

function isValidReactiveObject(item: ReactiveObject<any> | undefined): boolean {
  if (!item || typeof item.get !== 'function' || typeof item.set !== 'function') {
    return false;
  }
  try {
    const testKey = Object.keys(item).find(key => typeof item[key as keyof typeof item] !== 'function') as keyof typeof item | undefined;
    if (testKey) {
      const value = item.get(testKey);
      item.set(testKey, value);
    }
    return true;
  } catch {
    return false;
  }
}

export function rdom(
  vnode: VNode | string | (() => unknown),
  parent: Node,
  realParent: Node,
  oldNode: Node | null = null
): Node | null {
  try {
    if (typeof vnode !== 'function') {
      if (typeof vnode === 'string' && vdomStringCache.has(vnode)) {
        const cached = vdomStringCache.get(vnode)!;
        if (oldNode && oldNode !== cached.domNode) {
          realParent.replaceChild(cached.domNode, oldNode);
        } else if (!oldNode) {
          realParent.appendChild(cached.domNode);
        }
        return cached.domNode;
      }
      if (typeof vnode !== 'string' && vdomObjectCache.has(vnode)) {
        const cached = vdomObjectCache.get(vnode)!;
        if (oldNode && oldNode !== cached.domNode) {
          realParent.replaceChild(cached.domNode, oldNode);
        } else if (!oldNode) {
          realParent.appendChild(cached.domNode);
        }
        return cached.domNode;
      }
    }

    if (typeof vnode === 'function') {
      let domNode: Node | null = null;
      createEffect(() => {
        const value = vnode();
        if (Array.isArray(value)) {
          const state = reactiveBindings.get(vnode) || { keyToItem: new Map<string, ListItemState>(), lastKeys: [] };
          const newKeys: string[] = [];
          const newKeyToItem = new Map<string, ListItemState>();
          value.forEach((child: VNode, index) => {
            if (!child || !child.props || !child.props.key) {
              console.warn(`Skipping invalid VNode at index ${index}: missing key`, child);
              return;
            }
            const key = String(child.props.key);
            const item = child.props.item as ReactiveObject | undefined;
            if (!isValidReactiveObject(item)) {
              console.warn(`Skipping invalid ReactiveObject at index ${index}, key ${key}`, item);
              return;
            }
            newKeys.push(key);
            const existingItem = state.keyToItem.get(key);
            if (existingItem && item && existingItem.reactiveObj === item && existingItem.vNode === child) {
              newKeyToItem.set(key, existingItem);
            } else {
              let node = existingItem?.node;
              let effectCleanup = existingItem?.effectCleanup;
              const vNode = child;
              if (effectCleanup && item !== existingItem?.reactiveObj) {
                effectCleanup();
                effectCleanup = undefined;
              }
              if (!effectCleanup) {
                const childNodes = vNode.children || [];
                childNodes.forEach((childNode, childIndex) => {
                  if (typeof childNode === 'function') {
                    effectCleanup = createEffect(() => {
                      const childValue = childNode();
                      if (node && node.childNodes[childIndex]) {
                        node.childNodes[childIndex].textContent = String(childValue);
                      }
                    });
                  }
                });
              }
              if (!node) {
                const newNode = rdom(vNode, realParent, realParent, null);
                if (newNode) node = newNode;
              }
              if (node && item) {
                newKeyToItem.set(key, { node, reactiveObj: item, effectCleanup, vNode });
              }
            }
          });
          state.keyToItem.forEach((item, key) => {
            if (!newKeyToItem.has(key) && item.node.parentNode === realParent) {
              if (item.effectCleanup) item.effectCleanup();
              item.reactiveObj.cleanup();
              realParent.removeChild(item.node);
              vdomObjectCache.delete(item.vNode);
            }
          });
          // Optimize DOM updates for swaps
          if (newKeys.length === state.lastKeys.length) {
            // Fast path for swaps or reordered lists
            for (let i = 0; i < newKeys.length; i++) {
              if (newKeys[i] !== state.lastKeys[i]) {
                const key = newKeys[i];
                const item = newKeyToItem.get(key)!;
                const node = item.node;
                const currentNode = realParent.childNodes[i];
                if (node !== currentNode) {
                  realParent.insertBefore(node, currentNode || null);
                }
              }
            }
          } else {
            // Full update for length changes
            for (let i = 0; i < newKeys.length; i++) {
              const key = newKeys[i];
              const item = newKeyToItem.get(key)!;
              const node = item.node;
              const currentNode = realParent.childNodes[i];
              if (node !== currentNode) {
                realParent.insertBefore(node, currentNode || null);
              }
            }
          }
          state.keyToItem.clear();
          newKeyToItem.forEach((item, key) => state.keyToItem.set(key, item));
          state.lastKeys = newKeys;
          reactiveBindings.set(vnode, state);
          if (!domNode) {
            domNode = state.keyToItem.get(newKeys[0])?.node || null;
          }
        } else {
          const textContent = String(value);
          if (!domNode) {
            domNode = document.createTextNode(textContent);
            if (oldNode) {
              realParent.replaceChild(domNode, oldNode);
            } else {
              realParent.appendChild(domNode);
            }
            vdomObjectCache.set(vnode, { domNode });
          } else {
            domNode.textContent = textContent;
          }
        }
      });
      return domNode;
    }

    if (typeof vnode === 'string') {
      const textNode = document.createTextNode(vnode);
      if (oldNode && oldNode.nodeType === 3) {
        oldNode.textContent = vnode;
        vdomStringCache.set(vnode, { domNode: oldNode });
        return oldNode;
      }
      realParent.appendChild(textNode);
      vdomStringCache.set(vnode, { domNode: textNode });
      return textNode;
    }

    const { tag, props, children } = vnode as VNode;
    if (!tag) {
      console.warn('Invalid VNode: no tag', vnode);
      return null;
    }

    const element = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        element.addEventListener(key.slice(2).toLowerCase(), value as EventListener);
      } else if (typeof value === 'function') {
        createEffect(() => {
          element.setAttribute(key, String(value()));
        });
      } else if (key !== 'key' && key !== 'item') {
        element.setAttribute(key, String(value));
      }
    }
    children.forEach((child, index) => {
      try {
        rdom(child, element, element);
      } catch (e) {
        console.error(`Error rendering child at index ${index}:`, e);
      }
    });
    if (oldNode) {
      realParent.replaceChild(element, oldNode);
    } else {
      realParent.appendChild(element);
    }
    vdomObjectCache.set(vnode, { domNode: element });
    return element;
  } catch (e) {
    console.error('rdom error:', e);
    return null;
  }
}

// --- Implementation Code (Minimized) ---

import { buildData } from "./data";

const { Div, Table, Tbody, Tr, Td, Button, Span, A, H1 } = html;

interface BenchData {
  id: number;
  label: string;
}

type ReactiveRow = ReactiveObject<BenchData>;

interface RowProps {
  item: ReactiveObject<BenchData>;
}

const items = createSignal<ReactiveRow[]>([]);
const selected = createSignal<number | undefined>(undefined);

const create = (count: number) => {
  items.set(buildData(count).map(item => createStore(item)));
};

const append = (count: number) => {
  items.set([...items.get(), ...buildData(count).map(item => createStore(item))]);
};

const update = () => {
  const data = items.get();
  for (let i = 0; i < data.length; i += 10) {
    if (data[i]) data[i].set('label', data[i].get('label') + ' !!!');
  }
};

const remove = (id: number) => {
  const data = [...items.get()];
  const idx = data.findIndex(d => d?.get('id') === id);
  if (idx !== -1) {
    data.splice(idx, 1);
    items.set(data);
  }
};

const select = (id: number) => {
  selected.set(id);
};

const clear = () => {
  items.set([]);
};

const swapRows = () => {
  const data = items.get();
  if (data.length > 998 && data[1] && data[998]) {
    const newData = [...data];
    newData[1] = data[998];
    newData[998] = data[1];
    items.set(newData);
  }
};

function Row(item: ReactiveRow): VNode {
  return Tr(
    {
      key: item.get('id'),
      item: item,
      class: () => (selected.get() === item.get('id') ? 'danger' : ''),
      'data-id': item.get('id'),
    },
    Td({ class: 'col-md-1' }, () => item.get('id')),
    Td({ class: 'col-md-4' },
      A({ class: 'lbl', onClick: () => select(item.get('id')) }, () => item.get('label')),
    ),
    Td({ class: 'col-md-1' },
      A({ class: 'remove', onClick: () => remove(item.get('id')) },
        Span({ class: 'glyphicon glyphicon-remove', ariaHidden: 'true' }),
      ),
    ),
  );
}

function DataTable(): VNode {
  return Table(
    { class: 'table table-hover table-striped test-data' },
    Tbody(
      { id: 'tbody' },
      () => items.get().map(item => Row(item))
    ),
  );
}

function Bench(): VNode {
  return Div({ id: 'main' },
    Div({ class: 'container' },
      Div({ class: 'jumbotron' },
        Div({ class: 'row' },
          Div({ class: 'col-md-6' }, H1({}, 'Benchmark')),
          Div({ class: 'row' },
            Button(
              { onClick: () => create(1000), class: 'btn btn-primary btn-block' },
              'Create 1,000 rows'
            ),
            Button(
              { onClick: () => create(10000), class: 'btn btn-primary btn-block' },
              'Create 10,000 rows'
            ),
            Button(
              { onClick: () => append(1000), class: 'btn btn-primary btn-block' },
              'Append 1,000 rows'
            ),
            Button(
              { onClick: update, class: 'btn btn-primary btn-block' },
              'Update every 10th row'
            ),
            Button({ onClick: clear, class: 'btn btn-primary btn-block' }, 'Clear'),
            Button({ onClick: swapRows, class: 'btn btn-primary btn-block' }, 'Swap Rows'),
          ),
        ),
      ),
      DataTable(),
      Span({ class: 'preloadicon glyphicon glyphicon-remove' }, ''),
    ),
  );
}

const app = document.getElementById('app');
if (app) {
  const vdom = Bench();
  rdom(vdom, app, app);
} else {
  console.error('No #app element found');
}