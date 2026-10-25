import type {
  DirectListenerSpec,
  ErrorConfig,
  HellaElement,
  HookFn,
  HookType,
  RenderFn,
} from "./types/nodes";
import { isFunction, isNumber, isObject, isString } from "./internal/core";
import { renderProp, resolveDeep, toText, isTemplateBuild, isHellaNode } from "./internal/utils";
import { setNodeHandler } from "./internal/events";
import { bindDirectHandler } from "./internal/cleanup";
import { dispatchError, findBoundary, toError } from "./internal/dispatch";
import {
  adopting,
  claims,
  constructFresh,
  peekClaimParent,
  routeClaimParent,
} from "./internal/adoption";
import { registry } from "./registry";
import { getState, peekInsertionNs } from "./internal/state";
import {
  NO_VALUE,
  childNamespaceOf,
  cloneUpgrading,
  getBoundaryConfig,
  parseRawHtml,
  resolveNode,
  runReactiveChild,
} from "./internal/render";

/**
 * A build function flagged by {@link mark} (or `component()`): calling it constructs a fresh
 * DOM root from a cached template. `props` carries reconciliation metadata (`key`) that
 * `ForEach` reads; `componentScope` is the owner dispose chain `component()` attaches and
 * the mount paths wire onto the constructed root.
 */
export type TemplateBuildFn = (() => Element) & {
  isTemplate: true;
  props?: Record<string, unknown>;
  componentScope?: () => void;
};

/**
 * `html` string + namespace → create function caches, one per compiler form so the same html
 * string through `template` and `fragment` cannot collide (the forms differ in what the create
 * fn returns). Keyed by the exact html string plus the parse namespace (a `\u0000` separator —
 * the same html must parse once per context): identical strings parse once; create functions
 * are cached so repeated calls return the same function.
 */
const templateBuilders = new Map<string, () => Element>();
const fragmentBuilders = new Map<string, () => DocumentFragment>();

/** SVG namespace URI — the compiler emits this constant for svg-interior templates (`template(html, ns)`). */
const SVG_XMLNS = "http://www.w3.org/2000/svg";
/** MathML namespace URI — the MathML counterpart of {@linkcode SVG_XMLNS}. */
const MATHML_XMLNS = "http://www.w3.org/1998/Math/MathML";

/**
 * Rebuilds a parsed template tree in the namespace the live tree requires: children inherit a
 * foreign parent's namespace, `foreignObject` is the HTML integration point, and inline
 * `svg`/`math` elements switch context natively. The root intent is the caller's `ns` — the
 * compiler emits it from static JSX ancestry (happy-dom lacks the foreignObject/MathML
 * integration points and its HTML-context parse misnamespaces foreign-interior content, so
 * parsed trees are re-created through `createElementNS`; no tag tables — the compiler's param
 * replaced them). Runs once per unique html string (builders cache their create fns); the
 * create path itself stays a plain `cloneNode(true)`.
 * @param node The parsed node to rebuild
 * @param ns The parse namespace inherited from the insertion ancestry, or undefined for HTML
 * @returns The rebuilt node
 */
function rebuildInNamespace(node: Node, ns: string | undefined): Node {
  if (node.nodeType !== Node.ELEMENT_NODE) return node.cloneNode(true);
  const element = node as Element;
  const tag = element.tagName;
  const lower = tag.toLowerCase();
  // Unknown-in-HTML elements preserve the authored case in tagName (clipPath); known HTML
  // tags arrive uppercased, where creation is case-insensitive anyway.
  let elementNs = ns;
  if (lower === "svg") elementNs = SVG_XMLNS;
  else if (lower === "math") elementNs = MATHML_XMLNS;
  // An HTML-context parse uppercases unknown tagNames ("CIRCLE"); foreign-namespace creation
  // is case-sensitive, so an all-uppercase tag rebuilds from its lowercase form while mixed-case
  // authors (clipPath) pass through as parsed.
  const foreignTag = tag === tag.toUpperCase() && tag !== lower ? lower : tag;
  const rebuilt = elementNs
    ? document.createElementNS(elementNs, foreignTag)
    : document.createElement(tag);
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i]!;
    rebuilt.setAttribute(attr.name, attr.value);
  }
  // foreignObject is the HTML integration point: its children reset to HTML (the svg/math
  // inheritance rule mirrors childNamespaceOf — a foreign parent passes its namespace down
  // unless it is a foreignObject, and html parents pass undefined).
  const childNs = elementNs !== undefined && lower !== "foreignobject" ? elementNs : undefined;
  const children = element.childNodes;
  for (let i = 0; i < children.length; i++) {
    rebuilt.appendChild(rebuildInNamespace(children[i]!, childNs));
  }
  return rebuilt;
}

/**
 * Rebuilds a fragment's children in `ns` (the fragment itself is a passive container —
 * {@link rebuildInNamespace} recurses from each child element).
 * @param source The fragment whose children rebuild
 * @param ns The parse namespace, or undefined for HTML
 * @returns A fresh fragment holding the rebuilt children
 */
function rebuildFragment(source: DocumentFragment, ns: string | undefined): DocumentFragment {
  const rebuilt = document.createDocumentFragment();
  const children = source.childNodes;
  for (let i = 0; i < children.length; i++) {
    rebuilt.appendChild(rebuildInNamespace(children[i]!, ns));
  }
  return rebuilt;
}

/**
 * Parses `html` and repairs namespaces: the parsed content rebuilds through
 * {@link rebuildInNamespace} so foreign-interior subtrees carry the namespace the compiled
 * ancestry requires (a bare `<circle>` template parsed in HTML would create an
 * HTMLUnknownElement — insertion into a live `<svg>` never upgrades the namespace).
 * @param html The template html
 * @param ns The parse namespace (compiler-supplied), or undefined for HTML
 * @returns The parsed content, correctly namespaced
 */
function parseWithContext(html: string, ns: string | undefined): DocumentFragment {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  return rebuildFragment(tpl.content, ns);
}

/**
 * Parses `html` once into a `<template>` element and returns its create function.
 * @param html The html to parse
 * @param singleRoot When true, the create fn clones the parsed root element (throwing when
 * the html has no element root); otherwise it clones the whole content fragment
 * @returns The create function over the parsed template
 */
function parseBuilder(
  html: string,
  singleRoot: boolean,
  ns: string | undefined,
): () => Element | DocumentFragment {
  const content = parseWithContext(html, ns);
  if (singleRoot && !content.firstElementChild) {
    throw new Error(`[dom] template: html must contain a root element, received ${html}`);
  }
  const proto = singleRoot ? content.firstElementChild! : content;
  // The custom-elements feature (loaded by the babel plugin for hyphenated JSX tag names)
  // registers the parse-time scan + create-time upgrade; the default resolves every template
  // to a no-upgrade create path — the scan itself is the feature module's internal detail.
  const upgrade = cloneUpgrading?.hasCustomElements(proto)
    ? cloneUpgrading.upgradeClone
    : undefined;
  return singleRoot
    ? () => {
        // Adoption: claim the matching server node instead of cloning (identity preserved — the
        // claimed node is already positioned, so callers never re-append it).
        if (adopting()) {
          const claimed = claims!.claimElement(peekClaimParent(), proto as Element);
          claims!.verifyFoldedChildren(claimed, proto as Element);
          getState(claimed);
          return claimed;
        }
        let root = proto.cloneNode(true) as Element;
        // Component-boundary content (ForEach items, Lazy loaders, Suspense children) parses
        // without compiler knowledge of its insertion ancestry — the resolver's frame carries
        // the foreign namespace here; re-create only on mismatch (compiler-ns parses match).
        const intent = peekInsertionNs();
        if (intent !== undefined && root.namespaceURI !== intent) {
          root = rebuildInNamespace(root, intent) as Element;
        }
        if (upgrade) {
          const fresh = upgrade(root);
          // The pass replaces a node only with its own upgraded counterpart (same tag),
          // so the single-root arm's replacement is an Element.
          if (fresh) root = fresh as Element;
        }
        // Root-state-first: child wiring called after this registers into the root's cleanup
        // overlay through the parentNode climb, so build fns never order their calls.
        getState(root);
        return root;
      }
    : () => {
        // Adoption: claim the static roots eagerly (inter-root regions are consumed into the
        // claim record for the wiring calls to dequeue). The token routes wiring calls to the
        // enclosing claim parent and carries the fragment scope via its first claimed root —
        // a fragment build never member-addresses its children, so the token itself is the
        // only surface the compiled output touches.
        if (adopting()) {
          return claims!.claimFragmentRoots(peekClaimParent(), proto as DocumentFragment);
        }
        const clone = proto.cloneNode(true) as DocumentFragment;
        const intent = peekInsertionNs();
        if (
          intent !== undefined &&
          clone.firstElementChild &&
          clone.firstElementChild.namespaceURI !== intent
        ) {
          clone.replaceChildren(...rebuildFragment(clone, intent).childNodes);
        }
        if (upgrade) upgrade(clone);
        // The first child carries the fragment's scope once mounted (mount anchors trail
        // content, so a leading static child is swap-stable); seeding its state here gives
        // the scope wiring a live carrier — the fragment itself is ephemeral on append.
        if (clone.firstChild) getState(clone.firstChild);
        return clone;
      };
}

/**
 * Compiles a single-root html string into a cached create function. Each call of the
 * returned function clones the parsed root element and state-inits it before returning,
 * so wiring calls (`text`, `prop`, `on`, ...) can run in any order against the clone.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param html The html string; must contain exactly one root element
 * @param ns The parse namespace for foreign-interior content (the compiler emits the
 * SVG/MathML URI from static JSX ancestry); undefined parses in HTML context
 * @returns A create function producing a fresh, state-initialized clone per call
 * @throws {Error} When `html` is not a string or has no element root.
 */
export function template(html: string, ns?: string): () => Element {
  if (!isString(html)) throw new Error(`[dom] template: html must be a string, received ${html}`);
  const key = ns === undefined ? html : `${ns}\u0000${html}`;
  let build = templateBuilders.get(key);
  if (!build) {
    build = parseBuilder(html, true, ns) as () => Element;
    templateBuilders.set(key, build);
  }
  return build;
}

/**
 * Compiles an html string into a cached create function returning the whole parsed
 * content as a DocumentFragment — the multi-root (`<>...</>`) counterpart of
 * {@link template}. Appending the fragment splays its children; the first child is
 * state-initialized as the scope carrier.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param html The html string; may contain any number of roots
 * @param ns The parse namespace for foreign-interior content (the compiler emits the
 * SVG/MathML URI from static JSX ancestry); undefined parses in HTML context
 * @returns A create function producing a fresh content clone per call
 * @throws {Error} When `html` is not a string.
 */
export function fragment(html: string, ns?: string): () => DocumentFragment {
  if (!isString(html)) throw new Error(`[dom] fragment: html must be a string, received ${html}`);
  const key = ns === undefined ? html : `${ns}\u0000${html}`;
  let build = fragmentBuilders.get(key);
  if (!build) {
    build = parseBuilder(html, false, ns) as () => DocumentFragment;
    fragmentBuilders.set(key, build);
  }
  return build;
}

/**
 * Flags a build function as a template build: sets `isTemplate` and attaches
 * reconciliation metadata. Flagged functions are recognized by every HellaNode-children
 * consumer (`resolveNode`, `child`, `ForEach`, `component()`), which invoke them and
 * mount the returned root instead of building a reactive region.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param fn The build function to flag (mutated in place)
 * @param props Reconciliation metadata carried on the fn — `key` is read by `ForEach`
 * @returns The same fn, flagged
 * @throws {Error} When `fn` is not a function.
 */
export function mark(fn: () => Element, props?: Record<string, unknown>): TemplateBuildFn {
  if (!isFunction(fn)) throw new Error(`[dom] mark: fn must be a function, received ${fn}`);
  const build = fn as TemplateBuildFn;
  build.isTemplate = true;
  if (props) build.props = props;
  return build;
}

/**
 * Wires a text child onto `parent`. Static values append one text node; function values
 * (signals, getters) append a persistent empty-text anchor once and register an effect
 * that keeps it in sync — the anchor doubles as the live text node for the region's
 * lifetime.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param parent The parent element
 * @param value The text value — a primitive or a reactive function resolving to one
 */
export function text(parent: Element, value: unknown): void {
  if (isFunction(value)) {
    // Adoption: marker-bounded server region — fragment-remembered regions dequeue first, else
    // consume at the claim cursor; the walker's `adoptReactiveRegion` owns the semantics.
    if (adopting()) {
      claims!.claimAndAdoptRegion(parent, value);
      return;
    }
    const anchor = document.createTextNode("");
    parent.appendChild(anchor);
    registry.addEffect(parent, () => {
      anchor.textContent = toText(resolveDeep(value));
    });
    return;
  }
  // Static values: the claimed subtree already contains the server text (the claim claimed it) —
  // appending would duplicate it. The create path appends; adoption is a no-op. A raw sentinel
  // value routes to the raw arms instead (the compiler emits raw children as static text calls).
  if (isObject(value) && "raw" in value) {
    if (adopting()) {
      claims!.claimOpaqueRegion(routeClaimParent(parent));
      return;
    }
    parent.appendChild(parseRawHtml((value as { raw: string }).raw));
    return;
  }
  if (adopting()) return;
  parent.appendChild(document.createTextNode(toText(value)));
}

/**
 * Wires one property/attribute onto `el`. Static values apply once through `renderProp`'s
 * full branch order; function values register an effect with a last-value memo — the
 * first run always applies, a recompute equal to the last applied value skips the write.
 * Effect errors dispatch through the error-boundary system (`update` phase).
 *
 * Keys starting exactly with `on:`, `e:`, `hook:`, or `error:` route to the same seams the
 * explicit emission calls — `on`/`direct`/`hook`, and a per-key merge into the element's
 * `errorConfig` that never touches `originalBuild` — so rest-forwarded prefixed attrs
 * from a component's `{...attrs}` spread land live. A function value under a prefixed
 * key is a handler/hook, never a reactive value source; a later routed write wins per
 * key for the override families (`on:`/`e:`/`error:` — `hook:` stays accumulative).
 * Colon-bearing keys outside the four families (`xlink:href`, `xml:lang`) and
 * colon-free keys keep the branches below verbatim.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param el The target element
 * @param key The property/attribute key
 * @param value The value — a primitive, a reactive function resolving to one, or a handler/hook/config value under a prefixed key
 */
export function prop(el: Element, key: string, value: unknown): void {
  if (key.startsWith("on:")) {
    on(el, key.slice(3), value as EventListener);
    return;
  }
  if (key.startsWith("e:")) {
    direct(el, key.slice(2), value as EventListener | DirectListenerSpec);
    return;
  }
  if (key.startsWith("hook:")) {
    hook(el, key.slice(5) as HookType, value as HookFn);
    return;
  }
  if (key.startsWith("error:")) {
    // Per-key merge; `originalBuild` is untouched — spread-carried error keys carry no
    // build fn, so the element's own `errorConfig()` build stays the reset target.
    const state = getState(el);
    state.errorConfig = { ...state.errorConfig, [key.slice(6)]: value } as ErrorConfig;
    return;
  }
  if (!isFunction(value)) {
    renderProp(el as HellaElement, key, value);
    return;
  }
  let last: unknown = NO_VALUE;
  registry.addEffect(el, () => {
    try {
      const v = value();
      if (v === last) return;
      last = v;
      renderProp(el as HellaElement, key, v);
    } catch (err) {
      const boundary = findBoundary(el);
      const fallback = dispatchError(toError(err), {
        phase: "update",
        element: el,
        config: getBoundaryConfig(boundary ?? undefined),
      });
      if (fallback)
        (boundary ?? el).replaceChildren(constructFresh(() => resolveNode(fallback, el)));
    }
  });
}

/**
 * Registers a delegated event handler on `el` (the `on:` prefix machinery — one shared
 * capture-phase body listener per event type).
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param el The target element
 * @param type The event type (e.g. `"click"`)
 * @param handler The event handler
 */
export function on(el: Element, type: string, handler: EventListener): void {
  setNodeHandler(el, type, handler);
}

/**
 * Registers a direct (non-delegated) event handler on `el` (the `e:` prefix machinery —
 * per-instance listener with error-boundary wrapping and native options forwarding).
 * The direct-events feature must be loaded for the registration to bind.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param el The target element
 * @param type The event type (e.g. `"focus"`)
 * @param handler The handler, or a `{ handler, options }` spec forwarding native listener options
 */
export function direct(
  el: Element,
  type: string,
  handler: EventListener | DirectListenerSpec,
): void {
  bindDirectHandler(el, type, handler);
}

/**
 * Registers a lifecycle hook on `el` (the `hook:` prefix machinery). The hooks feature
 * must be loaded for the registration to bind. Accumulative: hooks of the same type stack.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param el The target element
 * @param type The hook type (`beforeMount`, `afterMount`, ...)
 * @param fn The hook function
 */
export function hook(el: Element, type: HookType, fn: HookFn): void {
  registry.addHook(el, type, fn);
  if (type === "beforeMount") {
    // beforeMount fires synchronously at construction — the build body runs pre-insert,
    // so registering mid-build IS before mount. Errors: phase "mount", no fallback.
    try {
      (fn as () => void)();
    } catch (err) {
      const boundary = findBoundary(el);
      dispatchError(toError(err), {
        phase: "mount",
        element: el,
        config: getBoundaryConfig(boundary ?? undefined),
      });
    }
  }
}

/**
 * Attaches an error config to `el` (the `error:` prefix machinery) and snapshots the
 * element's build function as the reset target: when a wiring error dispatches to this
 * boundary, `context.reset()` re-invokes the build for fresh nodes.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param el The boundary element
 * @param config The error config (`fallback`, `boundary`, `category`)
 * @param build The element's own build function, re-invoked on reset
 */
export function errorConfig(el: Element, config: ErrorConfig, build: TemplateBuildFn): void {
  const state = getState(el);
  state.errorConfig = config;
  state.originalBuild = build;
}

/**
 * Wires one child value onto `parent` — the compiled counterpart of the walker's
 * child resolution. Strings and numbers append text nodes (numbers stringified —
 * happy-dom's textContent setter drops falsy values); functions build a reactive
 * region (persistent anchor + effect, `runReactiveChild` semantics); arrays
 * recurse in order; `raw()` html parses and inserts; flagged build fns invoke
 * inside a build frame and append the constructed root. Hand-built HellaNode
 * children (an ast-compiled fragment inside a dom-compiled tree) throw the
 * documented rejection. Booleans, null, and undefined render nothing.
 *
 * This is a compiler contract: emitted by the babel plugin's imperative target, stable
 * across semver, not a hand-authoring API.
 * @param parent The parent element
 * @param value The child value in any compiled form
 */
export function child(parent: Element, value: unknown): void {
  if (isFunction(value)) {
    // A meta-component render fn (component()'s verbatim isDynamic passthrough) dispatches
    // directly against the parent — the walker's `child(parent)` semantics. Its render
    // errors propagate to the wiring call (Portal's target-not-found contract): routing
    // through the reactive-region machinery would run it inside runReactiveChild's catch,
    // boundary-dispatching (swallowing) the throw instead.
    if ((value as RenderFn).isDynamic) {
      // Adoption: the claim machinery owns meta dispatch (the walker's hydrateDynamic
      // equivalent) — the region machinery would bypass the hydration context.
      if (adopting()) {
        claims!.claimFlaggedChild(parent, value as never);
        return;
      }
      (value as RenderFn)(parent as HellaElement);
      return;
    }
    if (isTemplateBuild(value)) {
      // Adoption: a marker at the claim position means the site is a marker-bounded isDynamic
      // component (ForEach/Transition/Lazy/Suspense/Portal — a plain marked build is never
      // marker-bounded), dispatched through the walker's shared meta switch; otherwise the
      // flagged build claims positionally through `resolveNode` (the claimed root is already
      // positioned — no append), with the claim-parent frame seeding its create-fn claims.
      if (adopting()) {
        claims!.claimFlaggedChild(parent, value);
        return;
      }
      parent.appendChild(resolveNode(value, parent, childNamespaceOf(parent)));
      return;
    }
    // Adoption: marker-bounded reactive region — fragment-remembered regions dequeue first,
    // otherwise consume at the claim cursor; the walker's `adoptReactiveRegion` owns the
    // adopt-then-swap semantics (including resolved template-build roots on later runs).
    if (adopting()) {
      claims!.claimAndAdoptRegion(parent, value);
      return;
    }
    const anchor = document.createTextNode("");
    parent.appendChild(anchor);
    const ns = childNamespaceOf(parent);
    let nodes: Node[] | undefined = undefined;
    registry.addEffect(parent, () => {
      nodes = runReactiveChild(anchor, nodes, value, parent, undefined, ns);
    });
    return;
  }
  if (isHellaNode(value)) {
    // A HellaNode child in a dom-target build is hand-built input — the compiler emits
    // flagged builds; throw so the mistake surfaces at the wiring call, not as a silent no-op.
    throw new Error(
      "[dom] child: hand-built HellaNode input is not supported — compile via the babel plugin or build imperatively via @hellajs/dom/runtime",
    );
  }
  if (value instanceof Node) {
    // A raw DOM node (an eagerly-evaluated child expression — element() slot arrays, a
    // fragment create fn's product) appends directly, mirroring resolveNode's raw arm.
    // Unlike static text (which the claimed server subtree already carries), a raw Node
    // has no server counterpart — it exists only client-side, so it appends under
    // adoption too.
    parent.appendChild(value);
    return;
  }
  if (isString(value)) {
    if (adopting()) return; // static: already inside the claimed subtree
    parent.appendChild(document.createTextNode(value));
    return;
  }
  if (isNumber(value)) {
    if (adopting()) return; // static: already inside the claimed subtree
    parent.appendChild(document.createTextNode(String(value)));
    return;
  }
  if (Array.isArray(value)) {
    let i = 0;
    const len = value.length;
    while (i < len) {
      child(parent, value[i]!);
      i++;
    }
    return;
  }
  if (isObject(value) && "raw" in value) {
    // Adoption: today's rule — consume the region's markers opaquely, leaving the server nodes
    // unwired in place. Raw regions are always marker-bounded; a missing marker is divergence.
    if (adopting()) {
      claims!.claimOpaqueRegion(routeClaimParent(parent));
      return;
    }
    parent.appendChild(parseRawHtml((value as { raw: string }).raw));
  }
}
