import type { HellaChild, HellaElement, RenderFn, ErrorConfig } from "../types/nodes";
import { isFunction, isObject } from "./core";
import { toText, resolveDeep, chainScopes, wireFragmentScope, isTemplateBuild } from "./utils";
import { dispatchError, findBoundary, toError } from "./dispatch";
import { constructFresh, peekAdoption } from "./adoption";
import { registry } from "../registry";
import { cleanupSubtree } from "./cleanup";
import {
  getState,
  peekState,
  popBuildParent,
  pushBuildParent,
  popInsertionNs,
  pushInsertionNs,
} from "./state";

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
 * through {@link setNamespaceResolution} (the injection pattern) while
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
 * injection pattern — the SVG/MathML constants and the createElementNS
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
 * Registers the raw feature's HTML parser (the injection pattern — the
 * template parse lives in `lib/features/raw.ts` so it tree-shakes out of bundles that
 * never import `raw`).
 * @param parse The HTML parser implementation
 */
export function setRawHtmlParser(parse: (html: string) => DocumentFragment): void {
  parseRawHtml = parse;
}

/**
 * The custom-elements feature's clone-upgrade implementations, registered at its module init.
 */
interface CloneUpgrading {
  /** True when any element in the parsed tree has a hyphenated local name. */
  hasCustomElements(node: Node): boolean;
  /** Upgrades every defined custom element in a fresh clone, replacing the node when the root itself is one. */
  upgradeClone(node: Node): Node;
}

/**
 * @internal
 * The template/fragment clone-upgrade pass for defined custom elements. The default (custom-elements
 * feature not loaded) is `undefined` — template builders resolve to a no-upgrade create path, so
 * programs without hyphenated tags neither scan clones nor ship the machinery. The custom-elements
 * feature (`lib/features/custom-elements.ts`, loaded by the babel plugin for hyphenated JSX tag
 * names) registers the parse-time scan + create-time upgrade here.
 *
 * Exported `let` is deliberate: swapped at module init by the feature via
 * {@link setCloneUpgrader} while every importer keeps the live binding.
 */
export let cloneUpgrading: CloneUpgrading | undefined;

/**
 * @internal
 * Registers the custom-elements feature's clone upgrade (the injection pattern — the
 * hyphen scan and upgrade walk live in `lib/features/custom-elements.ts` so they
 * tree-shake out of bundles without hyphenated tags).
 * @param upgrading The clone-upgrade implementations
 */
export function setCloneUpgrader(upgrading: CloneUpgrading): void {
  cloneUpgrading = upgrading;
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
 * @param ns Optional namespace URI applied to foreign-namespace children
 * @returns The resolved DOM Node
 */
export function resolveNode(value: HellaChild | HellaChild[], parent?: Node, ns?: string): Node {
  if (value instanceof Node) return value;
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
  if (isObject(value) && "raw" in value) return parseRawHtml((value as { raw: string }).raw);
  if (isFunction(value)) {
    // A flagged template build fn constructs its own root — invoke it (build frame around the
    // call so creation-time overlay climbs see `parent`), then wire its componentScope onto
    // the returned root: element roots carry it on their own state; fragment roots are
    // ephemeral on append, so the scope rides the fragment's first child (the carrier
    // `fragment()` pre-states) through the shared fragment-scope wiring.
    if (isTemplateBuild(value)) {
      // try/finally, not bare push/pop: the build genuinely fails at runtime (first-call template
      // parse throws on rootless html) and a leaked frame would feed every later build a stale
      // insertion namespace / build parent.
      try {
        if (parent) pushBuildParent(parent);
        if (ns !== undefined) pushInsertionNs(ns);
        const root = value();
        if (value.componentScope) {
          if (root.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
            // An all-wirings fragment under adoption returns an empty token (its wirings claimed in
            // the enclosing parent) — the scope carrier is the first claimed region's anchor (the
            // pre-flip `regionPrev.nextSibling` contract: leads the parent, survives every swap,
            // never drained). Mount/clone fragments still carry on the last child (anchors trail).
            const claimRecord = peekAdoption()?.fragments.get(root);
            const carrier =
              claimRecord && claimRecord.claimedAnchors.length > 0
                ? claimRecord.claimedAnchors[0]!
                : root.lastChild;
            wireFragmentScope(carrier, null, value.componentScope);
          } else {
            const rootState = getState(root);
            rootState.componentScope = chainScopes(rootState.componentScope, value.componentScope);
          }
        }
        return root;
      } finally {
        if (ns !== undefined) popInsertionNs();
        if (parent) popBuildParent();
      }
    }
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
export function runReactiveChild(
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
      // A component()-wrapped meta's wrapper scope disposes with the region anchor.
      const renderScope = (resolved as { componentScope?: () => void }).componentScope;
      if (renderScope) {
        const anchorState = getState(anchor);
        anchorState.componentScope = chainScopes(anchorState.componentScope, renderScope);
      }
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
      resolved instanceof Node ||
      Array.isArray(resolved) ||
      isTemplateBuild(resolved) ||
      (isObject(resolved) && "raw" in resolved)
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
    // The runtime resolves the boundary at run time (no construction-time threading):
    // the nearest boundary of the live parent, falling back to the caller's threaded one.
    const boundary = currentBoundary ?? findBoundary(actualParent) ?? undefined;
    const config = getBoundaryConfig(boundary);
    const fallback = dispatchError(toError(e), { phase: "mount", element: actualParent, config });
    if (fallback) {
      clearRenderedNodes(nodes, actualParent);
      anchor.textContent = "";

      pushBuildParent(actualParent);
      const fbNode = constructFresh(() => resolveNode(fallback, parent, ns));
      popBuildParent();
      (nodes ??= []).push(fbNode);
      actualParent.insertBefore(fbNode, anchor);
    }
  }
  return nodes;
}
