import type {
  HellaNode,
  HellaChild,
  HellaElement,
  RenderFn,
  ErrorConfig,
  ElementHooks,
  DirectListenerSpec,
} from "../types/nodes";
import { isFunction, isString, isNumber, isObject, objectLoop } from "./core";
import {
  renderProp,
  toText,
  resolveDeep,
  chainScopes,
  wireFragmentScope,
  routePrefixedProps,
  routedPropsActive,
} from "./utils";
import { setNodeHandler, bindDirectHandler } from "./events";
import { dispatchError, toError } from "./dispatch";
import { registry } from "../registry";
import { cleanupSubtree } from "./cleanup";
import { getState, peekState, popBuildParent, pushBuildParent } from "./state";

let staticDom = new WeakMap<HellaNode, Element | DocumentFragment>();

/**
 * @internal
 * Last-value memo sentinel for reactive prop effects — the mount and hydrate twins
 * share this identity. It never equals a computed prop value (not even `undefined`),
 * so an effect's first run always applies; a bare `undefined` sentinel would skip
 * the hydrate twin's first-run removal of a server-rendered attribute.
 */
export const NO_VALUE: unknown = {};

/**
 * @internal
 * The HTML namespace URI — elements outside it (SVG, MathML) keep authored tag case.
 */
export const HTML_NS = "http://www.w3.org/1999/xhtml";

/**
 * @internal
 * Creates an element in its authored namespace. The default (namespaces feature not
 * loaded) is HTML-only — every tag creates with `document.createElement`; the
 * namespaces feature (`lib/features/namespaces.ts`, loaded by svg/math JSX via the
 * babel plugin, or by the hydrate entry) installs the SVG/MathML roots and
 * createElementNS inheritance under foreign-namespace parents.
 *
 * Exported `let` is deliberate: the feature swaps the implementation at module init
 * through {@link setNamespaceResolution} (the `setMountNode` injection pattern) while
 * every importer keeps the live binding.
 * @param tag The tag to create
 * @param ns The namespace URI inherited from the insertion parent, or undefined for HTML
 * @returns The created element
 */
export let createDomElement: (tag: string, ns: string | undefined) => HellaElement = (tag) =>
  document.createElement(tag) as HellaElement;

/**
 * @internal
 * Derives the creation namespace for children of `parent`: the parent's own namespace when it is
 * a foreign (SVG/MathML) element; `undefined` for HTML parents, fragments, text anchors, and
 * `foreignObject` (an HTML integration point inside SVG — its children reset to HTML). The
 * default (namespaces feature not loaded) resolves every parent to HTML — foreign-namespace
 * parents only exist once the feature does.
 *
 * Exported `let` is deliberate: swapped at module init by the namespaces feature via
 * {@link setNamespaceResolution} while every importer keeps the live binding.
 * @param parent The node whose children are being created
 * @returns The namespace URI to create children in, or undefined for HTML
 */
export let childNamespaceOf: (parent: Node | null) => string | undefined = () => undefined;

/**
 * The namespaces feature's resolution implementations, registered at its module init.
 */
interface NamespaceResolution {
  createDomElement: (tag: string, ns: string | undefined) => HellaElement;
  childNamespaceOf: (parent: Node | null) => string | undefined;
}

/**
 * @internal
 * Registers the namespaces feature's element-creation + child-namespace resolution (the
 * `setMountNode` injection pattern — the SVG/MathML constants and the createElementNS
 * branches live in `lib/features/namespaces.ts` so namespace wiring tree-shakes out of
 * HTML-only bundles).
 * @param resolution The namespace resolution implementations
 */
export function setNamespaceResolution(resolution: NamespaceResolution): void {
  createDomElement = resolution.createDomElement;
  childNamespaceOf = resolution.childNamespaceOf;
}

/**
 * @internal
 * Parses a raw HTML string into a fragment for insertion. The default (raw feature not
 * loaded) yields an empty fragment — raw children reach the mount path only through
 * `raw()` (which loads the feature) or the documented hand-built escape hatch.
 *
 * Exported `let` is deliberate: swapped at module init by the raw feature via
 * {@link setRawHtmlParser} while every importer keeps the live binding.
 * @param html The raw HTML string
 * @returns The parsed fragment
 */
export let parseRawHtml: (html: string) => DocumentFragment = () =>
  document.createDocumentFragment();

/**
 * @internal
 * Registers the raw feature's HTML parser (the `setMountNode` injection pattern — the
 * template parse lives in `lib/features/raw.ts` so it tree-shakes out of bundles that
 * never import `raw`).
 * @param parse The HTML parser implementation
 */
export function setRawHtmlParser(parse: (html: string) => DocumentFragment): void {
  parseRawHtml = parse;
}

/**
 * @internal
 * Applies one element's routed error config and resolves the boundary its
 * construction-time wiring dispatches against: the element itself when it carries an
 * error config, else the inherited boundary. The default (errors feature not loaded)
 * applies nothing and inherits — routed error configs only exist when the feature does.
 *
 * Exported `let` is deliberate: swapped at module init by the errors feature via
 * {@link setMountBoundaryResolver} while every importer keeps the live binding.
 * @param element The created element
 * @param routed The vnode's routed buckets
 * @param node The vnode (snapshotted as the reset target)
 * @param boundaryElement The inherited boundary, or undefined
 * @returns The boundary for this element's wiring
 */
export let resolveMountBoundary: (
  element: HellaElement,
  routed: {
    error: ErrorConfig | undefined;
  },
  node: HellaNode,
  boundaryElement: Element | undefined,
) => Element | undefined = (_element, _routed, _node, boundaryElement) => boundaryElement;

/**
 * @internal
 * Registers the errors feature's mount-boundary resolution (the `setMountNode`
 * injection pattern — the error-config application lives in `lib/features/errors.ts`
 * so error wiring tree-shakes out of bundles that never load the feature).
 * @param resolver The mount-boundary resolver
 */
export function setMountBoundaryResolver(resolver: typeof resolveMountBoundary): void {
  resolveMountBoundary = resolver;
}

/**
 * @internal
 * Wires one element's routed lifecycle hooks. The default (hooks feature not loaded)
 * wires nothing — routed hook buckets only exist when the feature does.
 *
 * Exported `let` is deliberate: swapped at module init by the hooks feature via
 * {@link setMountHookWiring} while every importer keeps the live binding.
 * @param element Target element
 * @param hooks The vnode's routed hooks bucket
 * @param boundary The nearest error boundary element, or undefined
 */
export let wireMountHooks: (
  element: Element,
  hooks: Partial<ElementHooks> | undefined,
  boundary: Element | undefined,
) => void = () => {};

/**
 * @internal
 * Registers the hooks feature's mount-hook wiring (the `setMountNode` injection
 * pattern — the hook registration + beforeMount run live in `lib/features/hooks.ts`
 * so hook wiring tree-shakes out of hook-free bundles).
 * @param wiring The mount-hook wiring implementation
 */
export function setMountHookWiring(wiring: typeof wireMountHooks): void {
  wireMountHooks = wiring;
}

/**
 * @internal
 * Clears the `staticDom` prototype cache — the next mount of each `static` subtree rebuilds
 * a fresh prototype. Wired into `resetDom()` for test isolation.
 */
export function clearStaticCache(): void {
  staticDom = new WeakMap();
}

/**
 * @internal
 * Gets the error boundary config for an element.
 * @param boundary The boundary element to check
 * @returns The error config, or undefined
 */
export function getBoundaryConfig(boundary: Element | undefined): ErrorConfig | undefined {
  if (!boundary) return undefined;
  const state = peekState(boundary);
  return state ? state.errorConfig : undefined;
}

/**
 * @internal
 * Clears a tracked rendered-nodes array, cleaning up each node before removal.
 * @param nodes The array of rendered nodes to clear, or undefined when the region has
 * rendered no nodes yet (lazy allocation — no-op)
 * @param parent The parent DOM node to remove children from
 */
export function clearRenderedNodes(nodes: Node[] | undefined, parent: Node) {
  if (!nodes) return;
  let i = 0;
  const len = nodes.length;
  while (i < len) {
    const n = nodes[i++]!;
    cleanupSubtree(n);
    parent.removeChild(n);
  }
  nodes.length = 0;
}

/**
 * @internal
 * Resolves a HellaChild to a DOM Node with reactive support. A `HellaChild[]` (compiled JSX
 * children arrive as an array) mounts each child into a `DocumentFragment`, mirroring the
 * ssr `walkChildren` array branch.
 * @param value The value to resolve (HellaChild, array of children, function, or primitive)
 * @param parent Optional parent element for effect registration
 * @param ns Optional namespace URI forwarded to `mountNode` for HellaNode children
 * @returns The resolved DOM Node
 */
export function resolveNode(value: HellaChild | HellaChild[], parent?: Node, ns?: string): Node {
  if (Array.isArray(value)) {
    const fragment = document.createDocumentFragment();
    let i = 0;
    const len = value.length;
    while (i < len) {
      fragment.appendChild(resolveNode(value[i]!, parent, ns));
      i++;
    }
    return fragment;
  }
  if (isObject(value)) {
    // HellaNode first — the common object child; DOM Nodes expose tagName, never tag
    if ((value as HellaNode).tag !== undefined) return mountNode(value as HellaNode, undefined, ns);
    if ("raw" in value) return parseRawHtml((value as { raw: string }).raw);
  }
  if (isFunction(value)) {
    // A reactive child is a region, not text: deep-resolve, then swap nodes or text ahead of a
    // persistent anchor. The anchor rides a detached carrier fragment so the effect's first
    // (synchronous) run inserts into it before the caller mounts the returned fragment — later
    // runs find the live parent, and a removed region bails on the anchor-parent null check.
    const anchor = document.createTextNode("");
    const carrier = document.createDocumentFragment();
    carrier.appendChild(anchor);
    const effectNode = parent || anchor;
    let nodes: Node[] | undefined = undefined;
    registry.addEffect(effectNode, () => {
      nodes = runReactiveChild(anchor, nodes, value, effectNode, undefined, ns);
    });
    return carrier;
  }
  return document.createTextNode(toText(value));
}

/**
 * @internal
 * Mounts a HellaNode to a DOM element or fragment with all properties and lifecycle hooks.
 * With the namespaces feature loaded (svg/math JSX, or the hydrate entry), a `svg` root
 * always creates in the SVG namespace and a `math` root in MathML; other tags inherit
 * `ns` when mounted under a foreign-namespace parent. Without the feature every tag
 * creates in HTML (see {@link createDomElement}).
 * @param node The HellaNode to mount
 * @param boundaryElement The nearest error boundary element (for error propagation during construction)
 * @param ns Optional namespace URI inherited from the insertion parent
 * @returns The mounted DOM element or fragment
 */
export function mountNode(
  node: HellaNode,
  boundaryElement?: Element,
  ns?: string,
): HellaElement | DocumentFragment {
  if (node.static) {
    const cached = staticDom.get(node);
    if (cached) {
      const clone = cached.cloneNode(true) as HellaElement | DocumentFragment;
      // The clone carries no ElementState — re-wire the scope for re-mounts of the
      // same node object (e.g. reset() re-mounting state.originalNode). A fragment
      // clone's children move out on insert, so the scope rides its last child
      // (chain: the child can carry an inner component's scope — same last-child
      // carrier as the `$` branch; a static fragment's children never swap); an
      // empty fragment clone has no DOM lifetime — dispose now.
      if (node.componentScope) {
        const target = clone.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? clone.lastChild : clone;
        if (target) {
          const cloneState = getState(target);
          cloneState.componentScope = chainScopes(cloneState.componentScope, node.componentScope);
        } else {
          node.componentScope();
        }
      }
      return clone;
    }
  }

  const { tag, props, on, e, hooks, children, componentScope, error } = node;

  if (tag === "$") {
    const fragment = document.createDocumentFragment();
    appendToParent(fragment as unknown as HellaElement, children, boundaryElement, ns);
    // The fragment is ephemeral — insertBefore/appendChild move its children out
    // and discard it — so the scope rides its LAST child (chained: the child can
    // already carry an inner component's scope, e.g. a compiled fragment `<>text<${B} /></>`). Mount-side
    // anchors trail their content (every reactive/dynamic child appends its persistent
    // anchor before inserting rendered nodes ahead of it), so the last node survives
    // every child swap; a static tail persists until subtree removal. An empty
    // fragment mounts nothing that owns the scope — wireFragmentScope disposes it.
    if (componentScope) wireFragmentScope(fragment.lastChild, null, componentScope);
    if (node.static) staticDom.set(node, fragment);
    return fragment;
  }

  const element = createDomElement(tag as string, ns);

  // Prefixed props keys ("on:click" from a component's rest-forwarding) slice
  // into their live buckets before wiring; other props render as attributes.
  // Feature-free bundles skip the call entirely — the identity bundle rebuild stays
  // by design (dual wiring paths would fork the error-boundary threading for a micro win).
  const routed = routedPropsActive
    ? routePrefixedProps(props as Record<string, unknown>, on, e, hooks, error)
    : { props: props as Record<string, unknown> | undefined, on, e, hooks, error };

  if (componentScope) {
    const state = getState(element);
    state.componentScope = chainScopes(state.componentScope, componentScope);
  }

  const currentBoundary = resolveMountBoundary(element, routed, node, boundaryElement);
  wireMountHooks(element, routed.hooks, currentBoundary);

  objectLoop(routed.props, (key, value) => {
    if (!isFunction(value)) {
      renderProp(element, key, value);
      return;
    }
    let last: unknown = NO_VALUE;
    registry.addEffect(element, () => {
      try {
        const v = value();
        if (v === last) return;
        last = v;
        renderProp(element, key, v);
      } catch (err) {
        const config = getBoundaryConfig(currentBoundary);
        const fallback = dispatchError(toError(err), { phase: "update", element, config });
        if (fallback) {
          const target = currentBoundary ?? element;
          target.replaceChildren(mountNode(fallback));
        }
      }
    });
  });

  objectLoop(routed.on, (eventName, handler) =>
    setNodeHandler(element, eventName, handler as EventListener),
  );

  if (routed.e) {
    objectLoop(routed.e, (eventName, handler) =>
      bindDirectHandler(element, eventName, handler as EventListener | DirectListenerSpec),
    );
  }

  appendToParent(element, children, currentBoundary);

  if (node.static) staticDom.set(node, element);
  return element;
}

/**
 * Appends children to a parent element with reactive support.
 * Handles static text, HellaNodes, functions, and forEach.
 * @param parent The parent element
 * @param children The children to append
 * @param currentBoundary The nearest error boundary element (for error propagation during construction)
 * @param ns Namespace inherited from the insertion context — used when `parent` is a DocumentFragment
 */
function appendToParent(
  parent: HellaElement,
  children?: HellaChild[],
  currentBoundary?: Element,
  ns?: string,
  topLevel = true,
) {
  if (!children || children.length === 0) return;

  if (topLevel && children.length === 1) {
    const only = children[0];
    if (isString(only)) {
      parent.textContent = only;
      return;
    }
    // String(0): happy-dom's textContent setter drops falsy values, and a raw number
    // relies on engine-side coercion — normalize to the createTextNode result instead.
    if (isNumber(only)) {
      parent.textContent = String(only);
      return;
    }
  }

  // Elements self-derive the child namespace; fragments carry the insertion context's ns
  const childNs = parent.nodeType === Node.ELEMENT_NODE ? childNamespaceOf(parent) : ns;

  let i = 0;
  const len = children.length;
  while (i < len) {
    const child = children[i];
    i++;

    if (Array.isArray(child)) {
      // Nested array children (e.g. a JSX `{items.map(…)}` expression evaluating to an
      // array, or component passthrough) — splice their elements in order, mirroring
      // ssr's array-children branch. Never a mid-list textContent target.
      appendToParent(parent, child, currentBoundary, childNs, false);
      continue;
    }

    if (isString(child)) {
      parent.appendChild(document.createTextNode(child));
      continue;
    }

    if (isFunction(child)) {
      if ((child as RenderFn).isDynamic) {
        child(parent);
        continue;
      }

      const anchor = document.createTextNode("");
      parent.appendChild(anchor);

      let nodes: Node[] | undefined = undefined;

      registry.addEffect(parent, () => {
        nodes = runReactiveChild(anchor, nodes, child, parent, currentBoundary, childNs);
      });

      continue;
    }

    if (isObject(child)) {
      // HellaNode first — the common object child; raw sentinels and DOM Nodes never carry tag
      if ((child as HellaNode).tag !== undefined) {
        // mountNode wires the child's state before any DOM link exists — the build frame lets
        // the child's creation-time overlay climb see this parent as its future ancestor.
        pushBuildParent(parent);
        const mounted = mountNode(child as HellaNode, currentBoundary, childNs);
        popBuildParent();
        parent.appendChild(mounted);
      } else if ("raw" in child) {
        parent.appendChild(parseRawHtml((child as { raw: string }).raw));
      } else if (child instanceof Node) {
        parent.appendChild(child);
      }
      continue;
    }

    if (isNumber(child)) {
      parent.appendChild(document.createTextNode(String(child)));
    }
    // booleans, null, undefined render nothing
  }
}

/**
 * Shared effect body for every reactive child region — direct element children and
 * children-array entries alike: deep-resolves the child, clears the previous run's nodes, and
 * mounts the classified value at the region anchor. A resolved `isDynamic` render function
 * dispatches against a proxy parent whose appends are tracked and inserted before the anchor;
 * node-valued results mount ahead of it; text settles INTO the anchor — the anchor doubles as
 * the persistent text node, so text regions keep their DOM node identity across updates. On
 * the effect's first (synchronous) run the anchor may still sit in `resolveNode`'s detached
 * carrier fragment — insertion then targets that fragment, and later runs find the live parent.
 * @param anchor The persistent empty text node marking the region's position
 * @param nodes The region's live node list — cleared and refilled every run; undefined
 * until the first node push lazily allocates it (text-only regions never allocate)
 * @param child The unresolved function child
 * @param parent The effect-registration node, and registration parent for nested regions
 * @param currentBoundary The nearest error boundary element, or undefined when unknown
 * @param ns The namespace URI inherited at the insertion site
 * @returns The region's node list after this run — the caller's closure rebinds it for the next run
 */
function runReactiveChild(
  anchor: Node,
  nodes: Node[] | undefined,
  child: unknown,
  parent: Node,
  currentBoundary: Element | undefined,
  ns?: string,
): Node[] | undefined {
  const actualParent = anchor.parentNode as HellaElement;
  if (!actualParent) return nodes;

  try {
    const resolved = resolveDeep(child);

    clearRenderedNodes(nodes, actualParent);

    if (isFunction(resolved) && (resolved as RenderFn).isDynamic) {
      anchor.textContent = "";
      const proxyParent = new Proxy(actualParent as Element, {
        get(target, prop) {
          if (prop === "appendChild") {
            return (node: Node) => {
              (nodes ??= []).push(node);
              return target.insertBefore(node, anchor);
            };
          }
          const val = (target as unknown as Record<string, unknown>)[prop as string];
          return isFunction(val) ? (val as (...args: unknown[]) => unknown).bind(target) : val;
        },
      });
      // Build frame: the region content mounts detached during this run — the frame lets its
      // creation-time overlay climb see the live parent (mount-path runs precede any observer).
      pushBuildParent(actualParent);
      (resolved as RenderFn)(proxyParent as HellaElement);
      popBuildParent();
      return nodes;
    }

    if (
      Array.isArray(resolved) ||
      (isObject(resolved) && ((resolved as HellaNode).tag !== undefined || "raw" in resolved))
    ) {
      anchor.textContent = "";
      pushBuildParent(actualParent);
      const newNode = resolveNode(resolved as HellaChild, parent, ns);
      popBuildParent();

      if (newNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        let fragChild: ChildNode | null;
        while ((fragChild = newNode.firstChild)) {
          (nodes ??= []).push(fragChild);
          actualParent.insertBefore(fragChild, anchor);
        }
      } else {
        (nodes ??= []).push(newNode);
        actualParent.insertBefore(newNode, anchor);
      }
      return nodes;
    }

    anchor.textContent = toText(resolved);
  } catch (e) {
    const config = getBoundaryConfig(currentBoundary);
    const fallback = dispatchError(toError(e), { phase: "mount", element: actualParent, config });
    if (fallback) {
      clearRenderedNodes(nodes, actualParent);
      anchor.textContent = "";

      pushBuildParent(actualParent);
      const fbNode = mountNode(fallback);
      popBuildParent();
      (nodes ??= []).push(fbNode);
      actualParent.insertBefore(fbNode, anchor);
    }
  }
  return nodes;
}
