/**
 * Hydration-adoption STATE half: the adoption context, its accessors, and the fresh-path escape.
 * The claim MACHINERY (the claim fns the construction calls hit under adoption) lives in
 * `internal/claims.ts` and registers itself through {@link setClaims} at module init — the
 * `registry.ts` live-binding seam (`runEffectHooks` + `setHooksFeature`, single-object form).
 * The split keeps `runtime.ts`'s static import graph free of the machinery, so a bundle that
 * never imports `hydrate` (or the opt-in meta-components) ships zero claim/adopt code: every
 * claim call site is guarded by {@link adopting} first, and the context is only ever pushed by
 * registered machinery, so the null-default seam is unreachable, not silently wrong.
 */

import type { TemplateBuildFn } from "../runtime";

/**
 * One consumed server region a fragment build remembered at claim time: its persistent anchor
 * (inserted where the open marker was) and the gathered nodes, waiting for the wiring call that
 * owns the site to adopt them (emission order = document order, so dequeue order matches).
 * @internal Exported for `internal/claims.ts`'s fragment records.
 */
export interface AdoptedRegion {
  anchor: Node;
  existing: Node[];
}

/**
 * Claim state for a fragment build under adoption: the enclosing claim parent whose cursor the
 * fragment's static roots and inter-root regions were consumed from, the regions remembered for
 * later wiring calls, and the claimed static roots (the scope carrier is the first).
 * @internal Exported for `internal/claims.ts`, which builds the records.
 */
export interface FragmentClaim {
  parent: Element;
  regions: AdoptedRegion[];
  roots: Node[];
  /** Anchors of regions already dequeued by wiring calls, in claim order — an all-wirings fragment's scope carrier reads the first one after the build (the token is returned before the wirings run, so it cannot). */
  claimedAnchors: Node[];
}

/**
 * Active hydration-adoption context — seeded by the machinery's `adoptTemplateRoot` around a
 * flagged root build so the construction calls CLAIM the server-rendered nodes instead of
 * cloning (Solid's one-output-two-behaviors model). `cursors` holds one scan pointer per claimed
 * parent, advanced in document order (the unit-02 emission rule — dynamic sites emit in document
 * order — is what makes positional claiming sound); `fragments` maps each adopting fragment token
 * to its claim record; `parents` is the claim-parent stack the create fns read (the wiring calls
 * route through it for ephemeral fragment tokens).
 * @internal Exported for `internal/claims.ts`, which seeds and scans the context.
 */
export interface AdoptionContext {
  cursors: Map<Element, Node | null>;
  fragments: Map<Node, FragmentClaim>;
  parents: Node[];
}

let adoption: AdoptionContext | undefined;

/**
 * The documented divergence contract: a claim with no matching server DOM, or server DOM no claim
 * consumed. @internal Exported for `internal/claims.ts` — defined here because
 * {@link peekClaimParent} throws it and the import direction runs machinery → state. Defined on the state half because {@link peekClaimParent} throws it and the import
 * direction runs machinery → state (`internal/claims.ts` reuses the constant — never a cycle).
 */
export const ADOPTION_MISMATCH = "[dom] hydrate: unmatched server DOM for imperative root";

/**
 * The claim machinery's implementations, registered at `internal/claims.ts` module init.
 */
interface Claims {
  adoptTemplateRoot: (container: Element, invoke: () => Node) => Node;
  adoptClaimFrame: (
    parent: Element,
    head: Node | null,
    invoke: () => void,
    bound: Node | null,
  ) => void;
  verifyFoldedChildren: (claimed: Element, proto: Element) => void;
  claimElement: (parent: Element, proto: Element) => Element;
  claimFragmentRoots: (parent: Element, proto: DocumentFragment) => DocumentFragment;
  claimFlaggedChild: (parent: Element, value: TemplateBuildFn) => void;
  claimAndAdoptRegion: (parent: Element, value: unknown) => void;
  claimOpaqueRegion: (parent: Element) => void;
}

/**
 * @internal
 * The registered claim machinery — every `adopting()`-guarded claim site in `lib/runtime.ts`
 * routes through this object. Exported `let` is deliberate: `internal/claims.ts` swaps the
 * object at module init through {@link setClaims} (the `runEffectHooks` injection pattern)
 * while every importer keeps the live binding. `null` until registration — see the module
 * docstring for why the default is unreachable.
 */
export let claims: Claims | null = null;

/**
 * @internal
 * Registers the claim machinery's implementations (called by `internal/claims.ts` at module
 * init; importing `hydrate` is what loads the machinery into a bundle).
 * @param registered The claim implementations
 */
export function setClaims(registered: Claims): void {
  claims = registered;
}

/**
 * @internal
 * Read-only view of the active adoption context for post-build scope wiring — render's flagged
 * fragment arm reads the claim record's `claimedAnchors` after the build's wiring calls ran (the
 * token is returned before the wirings, so the carrier is unknowable at claim time).
 */
export function peekAdoption(): AdoptionContext | undefined {
  return adoption;
}

/**
 * True while a flagged root build is claiming server DOM — the create-vs-adopt switch every
 * construction arm reads. Claiming is selected per call (builders cache their create fns at
 * module init, long before any hydration runs).
 * @internal Exported for the runtime's construction arms.
 */
export function adopting(): boolean {
  return adoption !== undefined;
}

/**
 * @internal
 * Pushes an adoption context — registered machinery only (`internal/claims.ts`'s claim frames).
 * @param ctx The context seeded for the enclosing claim frame
 */
export function pushAdoptionContext(ctx: AdoptionContext): void {
  adoption = ctx;
}

/**
 * @internal
 * Restores the previous adoption context — pairs with {@link pushAdoptionContext} in the
 * machinery's frame save/restore, so a failed adoption cannot leak the context into later
 * create-path renders.
 * @param prev The context active before the frame was pushed (undefined outside any frame)
 */
export function popAdoptionContext(prev: AdoptionContext | undefined): void {
  adoption = prev;
}

/** The claim parent a create fn claims from — the innermost `parents` frame (seeded by the root invocation and every nested positional flagged-fn arm). @internal Exported for the runtime's create fns. */
export function peekClaimParent(): Element {
  const parent = adoption?.parents[adoption.parents.length - 1];
  if (!adoption || !parent) throw new Error(ADOPTION_MISMATCH);
  return parent as Element;
}

/** Resolves the parent a wiring call claims from — an adopting fragment token routes to the enclosing claim parent captured at claim time (the fragment itself is ephemeral; its server content lives in the real parent). @internal Exported for the runtime's wiring calls. */
export function routeClaimParent(parent: Element): Element {
  return adoption?.fragments.get(parent)?.parent ?? parent;
}

/**
 * Runs `invoke` with the adoption context suppressed — the error-fallback escape: fallback
 * UI is fresh error output, never server-claimed content, so a fallback firing mid-root-build
 * (an effect's first run inside the claim frame) must construct through the create arms'
 * clone path instead of claiming from the (already advanced) cursor.
 * @internal Exported for the fallback/error arms (`render`, `events`, `ForEach`, `Portal`).
 * @param invoke The construction invocation
 * @returns The invocation's result
 */
export function constructFresh<T>(invoke: () => T): T {
  const prev = adoption;
  adoption = undefined;
  try {
    return invoke();
  } finally {
    adoption = prev;
  }
}
