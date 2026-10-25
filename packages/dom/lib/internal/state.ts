import type {
  ErrorConfig,
  HellaElement,
  HookType,
  HookFn,
  DirectListenerSpec,
} from "../types/nodes";

/**
 * @internal
 * Element state stored in a WeakMap, keyed by DOM node.
 * No properties are added to DOM elements themselves.
 * Every collection field (`handlers`, `effects`, `directHandlers`, `hooks`) is
 * lazy-allocated on first use so elements that never carry `on:` handlers /
 * function-ref prop effects / `e:` handlers / `hook:` hooks pay no collection
 * allocation at mount.
 */
export interface ElementState {
  effects?: (() => void)[];
  handlers?: Record<string, EventListener>;
  directHandlers?: Map<string, DirectListenerSpec>;
  hooks?: Partial<Record<HookType, Array<HookFn>>>;
  isMounted: boolean;
  componentScope?: () => void;
  portalCleanup?: () => void;
  /** Disposer registered by ForEach on its text anchor: removes every tracked item from its live parent and clears the key maps. */
  forEachCleanup?: () => void;
  errorConfig?: ErrorConfig;
  /** Reset target for flagged template roots carrying an `error:` config — `dispatchError`'s reset arm re-invokes the build for fresh nodes. */
  originalBuild?: () => HellaElement;
  cachedBoundary?: Element;
  lazyCleanup?: () => void;
  transitionCleanup?: () => void;
  suspenseCleanup?: () => void;
  /** Nearest state-carrying descendants, registered at their state creation; `clean` drains them transitively so subtree cleanup skips stateless nodes. Lifetime is bounded by this state's WeakMap entry. */
  dirtyChildren?: Set<Node>;
  /** Ancestor whose `dirtyChildren` holds this node — O(1) unregister when this node's state is cleaned. */
  registeredIn?: Node;
}

const elementMap = new WeakMap<Node, ElementState>();

/** Parents currently being built — the future ancestor chain for nodes built detached (reactive regions, flagged build frames, ForEach item builds, event fallbacks). */
const buildParents: Node[] = [];

/** Insertion namespaces for flagged template builds whose parse could not know their authored namespace (component boundaries sever static JSX ancestry — ForEach items, Lazy loaders, Suspense children). Empty for HTML insertions: the namespaces feature default resolves every parent to HTML, so the frame never opens and the create-fn hot path stays a plain clone. */
const insertionNs: string[] = [];

/**
 * @internal
 * Marks `parent` as the DOM parent whose child is being built. The build frames around
 * `resolveNode`'s flagged branch, `runReactiveChild`'s region arms, and ForEach's item
 * builds push so each child's creation-time overlay climb can fall back to the stack —
 * build wiring completes before the node is inserted, leaving `parentNode` null at state
 * creation.
 * @param parent The parent the child will be appended to
 */
export function pushBuildParent(parent: Node): void {
  buildParents.push(parent);
}

/**
 * @internal
 * Ends the build frame opened by `pushBuildParent`.
 */
export function popBuildParent(): void {
  buildParents.pop();
}

/**
 * @internal
 * Opens an insertion-namespace frame around a flagged template build whose insertion parent
 * is foreign-namespace: the create fn's clone step re-creates through the tableless namespace
 * walk when the parsed tree's namespace ≠ this intent (component-boundary content — the
 * compiler cannot emit the parse `ns` for JSX inside callbacks).
 * @param ns The insertion namespace (`childNamespaceOf(parent)`)
 */
export function pushInsertionNs(ns: string): void {
  insertionNs.push(ns);
}

/**
 * @internal
 * Ends the frame opened by `pushInsertionNs`.
 */
export function popInsertionNs(): void {
  insertionNs.pop();
}

/**
 * @internal
 * The innermost open insertion namespace, or undefined (the common case: HTML insertions —
 * the namespaces feature default never pushes).
 * @returns The insertion namespace, or undefined for HTML
 */
export function peekInsertionNs(): string | undefined {
  return insertionNs[insertionNs.length - 1];
}

/**
 * Gets or creates the state object for a DOM node.
 * @param node The DOM node to get state for
 * @returns The element state object
 */
export function getState(node: Node): ElementState {
  let state = elementMap.get(node);
  if (!state) {
    state = {
      isMounted: false,
    };
    elementMap.set(node, state);
    registerOverlay(node, state);
  }
  return state;
}

/**
 * @internal
 * Registers a state-carrying node in its nearest state-carrying ancestor's `dirtyChildren`
 * overlay, so `clean` on that ancestor reaches this node transitively and subtree cleanup can
 * skip stateless nodes. Runs at state creation (climb from the node to the nearest ancestor
 * holding state) and on observer-visible moves (after the stale registration is dropped).
 * @param node The state-carrying node to register
 * @param state The node's own state — receives the `registeredIn` back-pointer
 */
export function registerOverlay(node: Node, state: ElementState): void {
  let ancestor = node.parentNode;
  while (ancestor) {
    const ancestorState = elementMap.get(ancestor);
    if (ancestorState) {
      const dirty = ancestorState.dirtyChildren ?? (ancestorState.dirtyChildren = new Set());
      dirty.add(node);
      state.registeredIn = ancestor;
      return;
    }
    ancestor = ancestor.parentNode;
  }
  let bi = buildParents.length;
  while (bi-- > 0) {
    const buildAncestor = buildParents[bi]!;
    const ancestorState = elementMap.get(buildAncestor);
    if (ancestorState) {
      const dirty = ancestorState.dirtyChildren ?? (ancestorState.dirtyChildren = new Set());
      dirty.add(node);
      state.registeredIn = buildAncestor;
      return;
    }
  }
  state.registeredIn = undefined;
}

/**
 * Checks if a DOM node has associated state.
 * @param node The DOM node to check
 * @returns True if the node has state
 */
export function hasState(node: Node): boolean {
  return elementMap.has(node);
}

/**
 * Returns the state object without creating one if absent.
 * @param node The DOM node to peek at
 * @returns The element state, or undefined if none exists
 */
export function peekState(node: Node): ElementState | undefined {
  return elementMap.get(node);
}

/**
 * Removes the state entry for a DOM node.
 * @param node The DOM node to delete state for
 */
export function deleteState(node: Node): void {
  elementMap.delete(node);
}
