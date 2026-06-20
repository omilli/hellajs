## [ ] tsconfig — remove redundant `lib/index.ts` from include
**Type:** Config

### Depends On
- None

### Objective
`packages/store/tsconfig.json` `include` lists each path at most once and matches the convention used by `core` and `dom`.

### Solution
The current `include` lists `lib/index.ts` explicitly even though `./lib/**/*.ts` already covers it:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": [
    "./lib/**/*.ts",
    "lib/index.ts",
  ],
}
```
Drop the redundant entry:
```json
{
  "extends": "../../tsconfig.base.json",
  "include": [
    "./lib/**/*.ts"
  ],
}
```

The same redundancy exists in `packages/router/tsconfig.json` and `packages/resource/tsconfig.json` — those are flagged here for awareness but are out of scope for this task. File a separate plan to dedupe across siblings if desired.

Trade-offs: none. The glob is a superset of the explicit path; TypeScript resolves the same file set.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] `bun bundle store` succeeds
- [ ] No new runtime dependency
- [ ] `tsconfig*` changes keep `strict: true` (inherited from `../../tsconfig.base.json`) — nothing was weakened
- [ ] Every `scripts` entry in `package.json` referenced by a workflow or another script still exists and still does what its callers expect
- [ ] Does `packages/store/tsconfig.json` contain exactly one entry under `include`?
- [ ] Does `bun check store` still type-check `lib/index.ts` after the dedup?
