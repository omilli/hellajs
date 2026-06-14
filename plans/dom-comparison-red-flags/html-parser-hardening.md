## [ ] HTML Parser Hardening

### Depends On
None

### Objective
Replace or supplement the regex-based HTML parser in `html.ts` with a more robust solution. The current regex parser fails on attributes with `>` in values, nested quotes, multi-line attributes, unquoted attributes, HTML comments, DOCTYPE, and CDATA sections.

### Tasks

#### [ ] Fix regex edge cases

As a baseline fix, update the regex patterns in `html.ts` to handle the most common real-world cases:
- Support single-quoted attribute values
- Support unquoted attribute values
- Strip newlines before parsing for multi-line attribute support
- Skip HTML comments (`<!-- ... -->`) during tokenization

This doesn't fix the fundamental regex approach but handles 90% of real-world usage immediately.

#### [ ] Implement Babel plugin compile-time transform

Add a parallel transform in `plugins/babel` that compiles `html` tagged templates to HellaNode AST at build time:
- Detect `html` tagged template expressions in the babel plugin
- Transform `html` tagged templates into HellaNode object literals
- Eliminate runtime parsing entirely when the plugin is used
- The runtime `html` function remains as a fallback for no-build-step usage

This is the recommended production approach — Solid, Svelte, and Vue all use compile-time transforms.

#### Solution

##### Tests

- Update `packages/dom/tests/html.test.ts` with edge case inputs:
  - Attributes containing `>` in values
  - Single-quoted attributes
  - Unquoted attributes
  - Multi-line templates
  - HTML comments (should be skipped)
  - DOCTYPE declarations (should produce empty/ignored)
  - Mixed quote styles
- Add babel plugin tests for `html` tagged template transform

##### Documentation

- Document the compile-time transform in the babel plugin README
- Update `comparison.md` section 14 (regex red flag → resolved)

##### Validation

- All existing html tests pass
- All new edge case tests pass
- Babel plugin correctly transforms `html\`...\`` to HellaNode AST
- `bun check dom` passes

### Tests
Test files: `packages/dom/tests/html.test.ts`, `plugins/babel/tests/`

Test scenarios:
- All edge case attribute formats
- HTML comments and DOCTYPE filtering
- Babel plugin output matches expected HellaNode structure
- Compiled templates produce same DOM output as runtime parsing

### Documentation
- `plugins/babel/README.md` — add html tagged template transform docs
- `packages/dom/comparison.md` — update red flag status
- `packages/dom/AGENTS.md` — update html parsing algorithm description

### Validation
- All edge case tests pass
- Babel plugin transform tests pass
- `bun check dom` passes
- `bun check babel` (or equivalent) passes
