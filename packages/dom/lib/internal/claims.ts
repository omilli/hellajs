import type { HellaChild, HellaElement, RenderFn } from "../types/nodes";
import type { TemplateBuildFn } from "../runtime";
import {
  ADOPTION_MISMATCH,
  type AdoptionContext,
  type FragmentClaim,
  peekAdoption,
  popAdoptionContext,
  pushAdoptionContext,
  routeClaimParent,
  setClaims,
} from "./adoption";
import {
  adoptReactiveRegion,
  adoptDynamicRegion,
  consumeRegion,
  isMarkOpen,
  tagMatches,
} from "./hydrate";
import { resolveNode } from "./render";

/**
 * Hydration-adoption MACHINERY half: the claim fns the construction calls hit under an active
 * adoption context. Split out of the state half (`internal/adoption.ts` — the ctx, its
 * accessors, and `constructFresh`) so only bundles that import `hydrate` (or the opt-in
 * meta-components) ship this code; registering into the state's seam at module init keeps the
 * runtime's claim sites behind one object reference instead of a static import edge.
 */

/**
 * Runs a flagged root build fn under the hydration-adoption context: the construction calls claim
 * `container`'s existing server nodes (identity-preserving — nothing is cloned or replaced) and the
 * context verifies claim exhaustion afterwards. Restores the previous context on any exit, so a
 * failed adoption cannot leak the context into later create-path renders.
 * @internal Exported for `lib/hydrate.ts`'s flagged-root branch.
 * @param container The hydrate target whose children are the server output
 * @param invoke The flagged build invocation (through `resolveNode`, so the scope wiring and build frame are the shared seams)
 * @returns The invoked build's root
 * @throws {Error} `ADOPTION_MISMATCH` when a claim finds no matching server node or server DOM remains unconsumed
 */
export function adoptTemplateRoot(container: Element, invoke: () => Node): Node {
  let root!: Node;
  adoptClaimFrame(container, container.firstChild, () => {
    root = invoke();
    const fragmentClaims = Array.from(peekAdoption()!.fragments.values());
    let fi = 0;
    while (fi < fragmentClaims.length) {
      if (fragmentClaims[fi++]!.regions.length > 0) throw new Error(ADOPTION_MISMATCH);
    }
  });
  return root;
}

/**
 * Runs `invoke` under a claim frame whose cursor for `parent` is seeded at an explicit node-list
 * head — the generalization of the root entry: the Suspense swapped-stage arm re-invokes a flagged
 * child with the stage's first node as the claim head, so its `template()`/`fragment()` create fns
 * claim and wire the stage nodes in place (construction order = document order — the documented
 * in-place hydrate contract, never a fresh re-render). Establishes a fresh adoption context when
 * none is active (the deferred-region watch fires outside the root build) and nests — cursor and
 * parents save/restore — when one is. Claim exhaustion follows the root rule: only an unconsumed
 * region marker after the build is divergence (trailing static structure is shared, never claimed).
 * @internal Exported for `lib/hydrate.ts`'s registration, `Suspense`'s swapped-stage arm, and the nested flagged-build dispatch below.
 * @param parent The element whose claim cursor is seeded
 * @param head The node the claims start from — the stage's first node (null when the stage is empty)
 * @param invoke The flagged child invocation (through `resolveNode`, so the scope wiring and build frame are the shared seams)
 * @param bound Where the frame's ownership ends — the leftover-marker scan stops here (the region's close-marker successor; null for the root frame, which owns the container to its end)
 * @throws {Error} `ADOPTION_MISMATCH` when an unconsumed region marker remains after the build
 */
export function adoptClaimFrame(
  parent: Element,
  head: Node | null,
  invoke: () => void,
  bound: Node | null = null,
): void {
  const prev = peekAdoption();
  const ctx: AdoptionContext = {
    cursors: new Map([[parent, head]]),
    fragments: new Map(),
    parents: [parent],
  };
  pushAdoptionContext(ctx);
  try {
    invoke();
    const cursorEntries = Array.from(ctx.cursors.values());
    let ci = 0;
    while (ci < cursorEntries.length) {
      let cur: Node | null = cursorEntries[ci++]!;
      while (cur && cur !== bound) {
        if (isMarkOpen(cur)) throw new Error(ADOPTION_MISMATCH);
        cur = cur.nextSibling;
      }
    }
  } finally {
    popAdoptionContext(prev);
  }
}

/**
 * Verifies a claimed element's folded static prefix: the template's element children (the
 * leading static fold — folding stops at the first dynamic child, so these are a prefix)
 * must exist server-side at the same element positions. Dynamic child sites claim separately
 * through their own calls; their server content adds no claimable elements at prefix
 * positions. Divergence here would otherwise surface as a folded wiring call addressing a
 * missing node (an invalid WeakMap key) instead of the documented mismatch.
 * @internal Exported for the seam object (`internal/adoption.ts`'s `Claims`).
 * @param claimed The claimed server element
 * @param proto The compiled template's root element
 * @throws {Error} `ADOPTION_MISMATCH` when a folded child position has no matching server element
 */
export function verifyFoldedChildren(claimed: Element, proto: Element): void {
  const protoKids = proto.children;
  const claimedKids = claimed.children;
  let pi = 0;
  while (pi < protoKids.length) {
    const expected = protoKids[pi]!;
    const actual = claimedKids[pi];
    if (!actual || !tagMatches(actual, expected.tagName)) {
      throw new Error(ADOPTION_MISMATCH);
    }
    pi++;
  }
}

/**
 * Claims the server node for a single-root template build: scans forward over the shared static
 * siblings (never claimed — the claimed subtree carries them), throws on an unconsumed region
 * marker (a dynamic site that has no wiring call yet cannot precede a claim in document order) or
 * a missing node, verifies the claimed element against the compiled template's root tag, and
 * advances the cursor past the claim. The claimed node is already positioned — callers must not
 * re-append it.
 * @internal Exported for the seam object (`internal/adoption.ts`'s `Claims`).
 */
export function claimElement(parent: Element, proto: Element): Element {
  const ctx = peekAdoption()!;
  let cur = claimCursor(ctx, parent);
  while (cur && cur.nodeType !== Node.ELEMENT_NODE) {
    if (isMarkOpen(cur)) throw new Error(ADOPTION_MISMATCH);
    cur = cur.nextSibling;
  }
  if (!cur || !tagMatches(cur as Element, proto.tagName)) throw new Error(ADOPTION_MISMATCH);
  ctx.cursors.set(parent, cur.nextSibling);
  return cur as Element;
}

/**
 * Claims a fragment build's static roots eagerly: the fragment's create fn runs before any of its
 * wiring calls, so the roots (the parsed html's child count) are claimed up front in document
 * order. Inter-root regions met along the way cannot wait for their wiring calls — they are
 * consumed into the claim record now (markers removed, anchor inserted) and dequeued when the
 * wiring call arrives. The returned token routes the fragment's wiring calls to the enclosing
 * claim parent and carries the fragment scope via its first claimed root — a fragment build never
 * member-addresses its children, so the token itself is the only surface the compiled output
 * touches.
 * @throws {Error} `ADOPTION_MISMATCH` when a root slot finds no server node of matching kind
 * @internal Exported for the seam object (`internal/adoption.ts`'s `Claims`).
 */
export function claimFragmentRoots(parent: Element, proto: DocumentFragment): DocumentFragment {
  const ctx = peekAdoption()!;
  const record: FragmentClaim = { parent, regions: [], roots: [], claimedAnchors: [] };
  let remaining = proto.childNodes.length;
  let cur = claimCursor(ctx, parent);
  while (remaining > 0) {
    if (cur && isMarkOpen(cur)) {
      const region = consumeRegion(parent, cur);
      record.regions.push({ anchor: region.anchor, existing: region.existing });
      cur = region.next;
      continue;
    }
    // Region anchors and parser whitespace are not claimable positions — skip them (the slot
    // matcher below only accepts element or content-text nodes).
    if (cur && cur.nodeType === Node.TEXT_NODE && !(cur as Text).nodeValue?.trim()) {
      cur = cur.nextSibling;
      continue;
    }
    if (!cur) throw new Error(ADOPTION_MISMATCH);
    const slot = proto.childNodes[proto.childNodes.length - remaining]!;
    if (
      slot.nodeType === Node.ELEMENT_NODE
        ? cur.nodeType !== Node.ELEMENT_NODE ||
          !tagMatches(cur as Element, (slot as Element).tagName)
        : cur.nodeType !== Node.TEXT_NODE
    ) {
      throw new Error(ADOPTION_MISMATCH);
    }
    record.roots.push(cur);
    cur = cur.nextSibling;
    remaining--;
  }
  ctx.cursors.set(parent, cur);
  // An all-wirings fragment (every child reactive/dynamic — no static slots) claims no roots; its
  // scope carrier is picked AFTER the build by render's flagged arm from `claimedAnchors[0]` —
  // the token is returned before the wiring calls run, so the anchor is unknowable here. The
  // empty-fragment token still routes the wirings to the enclosing claim parent via the record.
  const token = record.roots.length > 0 ? fragmentView(record) : document.createDocumentFragment();
  ctx.fragments.set(token, record);
  return token;
}

/**
 * The fragment-site claim token: a detached-fragment view over the claimed static roots. The
 * compiled build member-addresses wiring anchors exactly as it does on the mount path
 * (`firstElementChild`, `children[i]` — anchorExpression's only two forms), so the view resolves
 * those against the claimed roots in claim order (`children` semantics = element slots only);
 * `firstChild`/`lastChild` resolve over every root (render's scope-carrier pick reads `lastChild`);
 * every other access forwards to the empty detached fragment (its native `nodeType` = fragment).
 * Identity is stable: the same proxy instance keys the claim record, so the wiring calls' route
 * (`routeClaimParent`) and the post-build carrier read (`peekAdoption().fragments.get`) see it.
 * @param record The claim record whose roots the view exposes
 * @returns The token handed to the compiled build as its root
 */
function fragmentView(record: FragmentClaim): DocumentFragment {
  const target = document.createDocumentFragment();
  const elementRoots = record.roots.filter((node) => node.nodeType === Node.ELEMENT_NODE);
  const last = record.roots.length - 1;
  return new Proxy(target, {
    get(obj, prop) {
      if (prop === "firstElementChild") return elementRoots[0] ?? null;
      if (prop === "children") return elementRoots;
      if (prop === "childNodes") return record.roots;
      if (prop === "firstChild") return record.roots[0] ?? null;
      if (prop === "lastChild") return record.roots[last] ?? null;
      return Reflect.get(obj, prop);
    },
  }) as DocumentFragment;
}

/**
 * Adopts the site a compiled `child(parent, flaggedBuild)` call owns: a marker at the claim
 * position means the site is a marker-bounded isDynamic component (ForEach/Transition/Lazy/
 * Suspense/Portal — a plain marked build is never marker-bounded), dispatched through the
 * walker's shared meta switch; otherwise the flagged build claims positionally through
 * `resolveNode` (the claimed root is already positioned — no append), inside a claim-parent frame
 * seeding its create-fn claims.
 * @internal Exported for the seam object (`internal/adoption.ts`'s `Claims`).
 */
export function claimFlaggedChild(parent: Element, value: TemplateBuildFn): void {
  const ctx = peekAdoption()!;
  const rp = routeClaimParent(parent);
  let probe = claimCursor(ctx, rp);
  while (probe && probe.nodeType !== Node.ELEMENT_NODE && !isMarkOpen(probe)) {
    probe = probe.nextSibling;
  }
  if (probe && isMarkOpen(probe)) {
    const { anchor, existing, next } = consumeRegion(rp, probe);
    ctx.cursors.set(rp, next);
    // A marker-bounded flagged build that is NOT an isDynamic meta (a nested fragment
    // component site) owns the gathered region as its static content — seed the claim
    // cursor at the gathered head so its create fns claim the region's nodes in place
    // (the Suspense swapped-stage shape, generalized). IsDynamic renders dispatch below.
    if (!(value as unknown as RenderFn).isDynamic) {
      adoptClaimFrame(
        rp as Element,
        existing[0] ?? null,
        () => resolveNode(value, rp as Element),
        next,
      );
      return;
    }
    // A marker-bounded flagged build that IS dynamic is an isDynamic render fn by construction — only isDynamic
    // components own marker-bounded sites, and the `ssr` meta the dispatch reads rides the fn.
    adoptDynamicRegion(rp as HellaElement, value as unknown as RenderFn, anchor, existing, next);
    return;
  }
  runInClaimFrame(ctx, rp, () => resolveNode(value, rp));
}

/**
 * Adopts the reactive region a compiled `text`/`child` wiring call owns: a fragment-remembered
 * region is dequeued first (inter-root sites are consumed eagerly, before their wiring call runs),
 * otherwise the region is consumed at the claim cursor; the walker's `adoptReactiveRegion` owns
 * the adopt-then-swap semantics (including resolved template-build roots on later runs).
 * Shared verbatim by both wiring arms — the two call sites are identical by construction.
 * @internal Exported for the seam object (`internal/adoption.ts`'s `Claims`).
 */
export function claimAndAdoptRegion(parent: Element, value: unknown): void {
  const ctx = peekAdoption()!;
  const record = ctx.fragments.get(parent);
  const remembered = record && record.regions.length > 0 ? record.regions.shift() : undefined;
  const rp = remembered ? record!.parent : routeClaimParent(parent);
  const { anchor, existing } = remembered ?? claimRegion(ctx, rp);
  // Both claim paths land an anchor in the enclosing parent — retain it for the post-build
  // scope-carrier pick (an all-wirings fragment's token is returned before the wirings ran).
  record?.claimedAnchors.push(anchor);
  adoptReactiveRegion(rp as HellaElement, value as HellaChild, anchor, existing);
}

/**
 * Consumes the region a compiled `raw` child owns opaquely (today's walker rule: markers removed,
 * server nodes left in place unwired). Raw regions are always marker-bounded; a missing marker is
 * divergence.
 * @internal Exported for the seam object (`internal/adoption.ts`'s `Claims`).
 */
export function claimOpaqueRegion(parent: Element): void {
  const ctx = peekAdoption()!;
  const cur = claimCursor(ctx, parent);
  if (!cur || !isMarkOpen(cur)) throw new Error(ADOPTION_MISMATCH);
  const { next } = consumeRegion(parent, cur);
  ctx.cursors.set(parent, next);
}

/**
 * The parent's scan cursor, seeded at its first child on first touch; an explicit `has` check keeps an exhausted cursor (`null`) from re-seeding.
 */
function claimCursor(ctx: AdoptionContext, parent: Element): Node | null {
  return ctx.cursors.has(parent) ? ctx.cursors.get(parent)! : parent.firstChild;
}

/**
 * Runs `invoke` inside a claim-parent frame so nested flagged builds' create fns claim from the
 * right parent's cursor (the create fns read the innermost frame through `peekClaimParent`).
 */
function runInClaimFrame<T>(ctx: AdoptionContext, parent: Element, invoke: () => T): T {
  ctx.parents.push(parent);
  try {
    return invoke();
  } finally {
    ctx.parents.pop();
  }
}

/** Consumes the region a reactive wiring call owns (scan to the site's markers, consume through the walker's reader). A missing marker degrades exactly like the AST walk: warn + fresh anchor with nothing to adopt. */
function claimRegion(ctx: AdoptionContext, parent: Element): { anchor: Node; existing: Node[] } {
  let cur = claimCursor(ctx, parent);
  while (cur && !isMarkOpen(cur)) cur = cur.nextSibling;
  if (!cur) {
    console.warn("[dom] hydrate: expected reactive-region marker, not found");
    const anchor = document.createTextNode("");
    const at = claimCursor(ctx, parent);
    if (at) parent.insertBefore(anchor, at);
    else parent.appendChild(anchor);
    return { anchor, existing: [] };
  }
  const { anchor, existing, next } = consumeRegion(parent, cur);
  ctx.cursors.set(parent, next);
  return { anchor, existing };
}

// Registration at module init (the injection pattern): importing this module (via `hydrate`,
// Suspense, or the meta-components) wires the claim machinery into the state half's seam, so
// the runtime's `adopting()`-guarded claim sites resolve it at call time.
setClaims({
  adoptTemplateRoot,
  adoptClaimFrame,
  verifyFoldedChildren,
  claimElement,
  claimFragmentRoots,
  claimFlaggedChild,
  claimAndAdoptRegion,
  claimOpaqueRegion,
});
