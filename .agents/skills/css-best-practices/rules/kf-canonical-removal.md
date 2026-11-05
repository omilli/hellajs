---
title: Remove keyframes by definition object, order never matters
impact: LOW
impactDescription: removeKeyframes takes the step object, not the returned name, and matches by canonicalized content, so a name-based removal attempt throws while an equivalent object in any key order removes exactly
tags: keyframes, removeKeyframes, removal
---

## Remove keyframes by definition object, order never matters

`keyframes()` canonicalizes its input before hashing: step keys and declarations are recursively key-sorted, so structurally equal definitions in any key order register one rule under one name. `removeKeyframes()` mirrors that derivation: pass a structurally equal object, not the returned `kf-{hash}` name (the name is a string, and the call throws on it) and not a specific object identity. Registration is reference-counted like every css-side registration; the rule drops at the last matching removal.

**Incorrect (what is wrong):**

```ts
import { keyframes, removeKeyframes } from "@hellajs/css";

const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

// Throws: removeKeyframes takes the definition object, not the name
removeKeyframes(spin);
```

**Correct (what is right):**

```ts
import { keyframes, removeKeyframes } from "@hellajs/css";

const spin = keyframes({
  from: { transform: "rotate(0deg)" },
  to: { transform: "rotate(360deg)" },
});

// Key order never matters: a structurally equal object matches
removeKeyframes({
  to: { transform: "rotate(360deg)" },
  from: { transform: "rotate(0deg)" },
});
```

Reference: `packages/css/lib/keyframes.ts keyframesRule` and `packages/css/lib/removeKeyframes.ts`
