## [ ] README — fix stale reference URL
**Type:** Docs

### Depends On
- None

### Objective
`packages/store/README.md` links to the documentation site using the URL scheme documented in `./guides/docs.md`, so the link resolves.

### Solution
`README.md:10-11` uses a URL fragment that does not match the docs site's URL scheme:
```markdown
- **[API Reference](https://hellajs.com/reference#hellajsstore)**
- **[Store Concepts](https://hellajs.com/learn/concepts/state#state-with-stores)**
```
`./guides/docs.md` § URL Scheme documents the canonical patterns:
- API reference: `/reference/{package}/{export}`
- Concepts: `/learn/concepts/{topic}`

Replace with:
```markdown
- **[API Reference](https://hellajs.com/reference/store/store)**
- **[Store Concepts](https://hellajs.com/learn/concepts/state)**
```

Verify the destination URLs resolve before merging; if the docs site uses a different actual route, update both the README and the URL scheme in `./guides/docs.md` so they agree.

Note: `README.md` lives at the package root, not under `docs/`, so it is not strictly governed by the docs guide's frontmatter/template rules — but link accuracy is in scope for any docs audit.

Trade-offs: none.

### Definition of Done
- [ ] Every code example in the changed docs compiles against current source signatures
- [ ] No claim in the changed docs contradicts the implementation
- [ ] Does `packages/store/README.md` no longer contain `#hellajsstore` or `#state-with-stores`?
- [ ] Do both links in `README.md` `## Documentation` match the URL scheme in `./guides/docs.md` § URL Scheme?
- [ ] Do both URLs resolve with HTTP 200 when fetched?
