## [ ] Support Shadow DOM in $ref and $collection auto-watching

### Depends On
None

### Objective
At `lib/internal/selectors.ts`, the `$ref` and `$collection` auto-watching system uses a single `refObserver` MutationObserver on `document.body`. This means elements inside Shadow DOM trees are not discovered. In environments where Shadow DOM is used (or will be used after adding Shadow DOM support to `element()`), `$ref` and `$collection` cannot watch for elements inside shadow roots.

### Tasks

#### [ ] Extend refObserver to support Shadow DOM roots

#### Solution
When `ensureRefObserver()` is called, instead of observing only `document.body`, also observe known shadow roots. The `multiSelectors` map already tracks selectors and their callbacks. On discovery of a new shadow root (e.g., created by `element()` with `shadow: true`), register it with the observer.

Implementation approach:

1. **Track shadow roots**: Add a `WeakSet<ShadowRoot>` to track observed shadow roots.
2. **Extended observation**: When a new element is encountered that has a shadow root, observe it too. The MutationObserver on `document.body` discovers new elements appended to the light DOM — if those elements have shadow roots, start observing their shadow trees.
3. **`element()` integration**: When `element()` creates a shadow root, register it with the refObserver system so selectors can match deep descendants.
4. **Re-evaluate selectors on shadow root creation**: When a shadow root is attached, run the existing selector callbacks against its tree.

The key change in `selectors.ts`:

```ts
function observeShadowRoot(shadowRoot: ShadowRoot) {
  if (observedShadowRoots.has(shadowRoot)) return;
  observedShadowRoots.add(shadowRoot);
  refObserver.observe(shadowRoot, { childList: true, subtree: true });
  // Re-evaluate selectors against this shadow tree
  evaluateSelectors(shadowRoot);
}
```

And in the existing `processMutations` callback, after processing `addedNodes`, also check each added node for `shadowRoot` (if it's an element with `Element.prototype.shadowRoot`).

Note: `querySelector` does NOT penetrate shadow DOM boundaries. The `$ref`/`$collection` functions use `document.querySelector(selector)` for initial discovery. For shadow DOM support, the `evaluateSelectors` function needs to search within observed shadow roots too:

```ts
function evaluateSelectors(scope: Document | ShadowRoot) {
  multiSelectors.forEach((entry, selector) => {
    const nodes = scope.querySelectorAll(selector);
    entry.processNewNodes(Array.from(nodes));
  });
}
```

##### Tests
- Add test: $ref with selector matching element inside shadow root — verify discovery
- Add test: $collection with selector matching elements across multiple shadow roots — verify collection
- Add test: $ref with dynamic addition of element inside shadow root — verify auto-watching
- Add test: element() with shadow: true — $ref discovers its children
- Add test: non-shadow DOM — verify existing behavior preserved

##### Documentation
- AGENTS.md: update selectors.ts architecture to describe shadow root observation
- CHANGELOG: minor entry (feature addition)

##### Validation
- `bun check dom` passes
- Elements in shadow roots are discoverable by $ref and $collection
- Light DOM behavior unchanged

### Tests
Extend `tests/ref.test.ts` and `tests/collection.test.ts` with Shadow DOM test cases.

### Documentation
AGENTS.md: update "ref-observer" and "dom-reference-system" algorithms with shadow root observation.

### Validation
$ref and $collection work on elements inside shadow roots. No regression in light DOM behavior.
