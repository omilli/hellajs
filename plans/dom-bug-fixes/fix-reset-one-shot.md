## [ ] Fix error boundary reset() being one-shot

### Depends On
None

### Objective
`dispatch.ts:121-129` — The `reset()` function created during error dispatch reads `state.originalNode` from the boundary and re-renders it. However, the newly mounted nodes from `mountNodeFn(node)` do not get `originalNode` set on them. A second `reset()` call sees no `originalNode` and becomes a no-op.

### Tasks

#### [ ] Make reset() re-set originalNode after re-render

#### Solution
In the `reset` closure at `dispatch.ts:122-129`, after `boundary!.replaceChildren(mountNodeFn(node))`, re-read the HellaNode and re-set `originalNode` on the boundary's element state. The `node` captured in the closure is the original HellaNode reference, so it can be reused.

The fix is small:

```ts
const reset = originalNode
  ? () => {
      const node = peekState(boundary!)?.originalNode;
      if (node && mountNodeFn) {
        boundary!.replaceChildren(mountNodeFn(node));
        // Re-set originalNode so reset() works more than once
        getState(boundary!).originalNode = node;
      }
    }
  : undefined;
```

However, consider: should the newly mounted nodes from `mountNodeFn(node)` become the new `originalNode`? If the user modifies the bound node between resets, the second reset would re-render the original node, not the modified one. This is arguably correct — reset() should reset to the original template, not the last rendered version. So using the captured `node` is fine.

##### Tests
- Add test: trigger error → call reset() → trigger error again → call reset() again → verify both work
- Add test: reset() → modify node props → reset() again → verify original template is restored

##### Documentation
- AGENTS.md: update the `reset` behavior note
- CHANGELOG: patch entry

##### Validation
- `bun check dom` passes
- Manual review of the fix logic

### Tests
Extend `tests/error-reset.test.ts` with multi-reset scenarios.

### Documentation
AGENTS.md dispatch.ts section should note that reset() is now durable across multiple calls.

### Validation
Multiple consecutive reset() calls all restore the original content.
