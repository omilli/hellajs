## [ ] package — ship the LICENSE file declared in `files`
**Type:** Config

### Depends On
- None

### Objective
The published tarball for `@hellajs/store` contains every file listed in `package.json` `"files"`, so `npm publish` does not warn and consumers receive the license.

### Solution
`package.json:21-25` declares:
```json
"files": [
  "dist",
  "README.md",
  "LICENSE"
]
```
But `packages/store/LICENSE` does not exist (verified by `ls`). npm will silently omit the missing file and the published tarball will not contain a license, which is a real packaging defect for a public MIT-licensed package.

Two acceptable fixes, picked by the maintainer:

**Fix A (preferred): add the file.** Add `packages/store/LICENSE` with the standard MIT license text matching the root license (the README already declares *"under the MIT License"*). The repository URL is `git+ssh://git@github.com/omilli/hellajs.git`, so the copyright line should match the rest of the monorepo.

**Fix B (drop the entry):** Remove `"LICENSE"` from the `files` array if the root-level license is meant to cover the package and per-package files are intentionally omitted. This is the weaker option because npm publishes each workspace package independently and the root license does not travel with the tarball.

This same defect likely affects every package in the monorepo (each declares `"LICENSE"` in `files`); verifying and fixing all of them is out of scope here but should be tracked as a separate cross-package task.

Trade-offs: Fix A is one new file with standard content. Fix B saves a file but ships a tarball with no license text — not recommended for public packages.

### Definition of Done
- [ ] `bun check store` exits 0
- [ ] `bun lint` exits 0
- [ ] `bun bundle store` succeeds
- [ ] No new runtime dependency
- [ ] No new or changed ESLint rule contradicts `./guides/code.md`
- [ ] Every `scripts` entry in `package.json` referenced by a workflow or another script still exists and still does what its callers expect
- [ ] Does `packages/store/LICENSE` exist, OR is `"LICENSE"` removed from `package.json` `"files"`?
- [ ] Does `npm pack --dry-run` (run from `packages/store/`) show a LICENSE file in the tarball when Fix A is chosen?
