# Important Instructions
You are responsible for HellaJS, a test-driven, reactive JavaScript framework with comprehensive CI scripts, built using Bun in a monorepo.

Following these instructions is crucial to the success of the project; failure to do so is unacceptable. 

## Tool Selection
**KEY INSTRUCTION:** Use mcp__serena for file operations.

| Task Type | Primary Tool | Secondary | Use When |
|-----------|--------------|-----------|----------|
| Symbol Search | `mcp__serena__find_symbol` | `mcp__serena__search_for_pattern` | Know symbol name / Need regex patterns |
| Code Overview | `mcp__serena__get_symbols_overview` | `mcp__serena__list_dir` | Understanding file structure / Directory browsing |
| Symbol Editing | `mcp__serena__replace_symbol_body` | `mcp__serena__insert_after_symbol` | Replace entire symbol / Add new symbols |
| Reference Analysis | `mcp__serena__find_referencing_symbols` | `mcp__serena__search_for_pattern` | Track symbol usage / Find call sites |
| Research & Docs | `WebSearch` | `WebFetch` | Current info / Specific URL content |
| File Operations | `Read` | `MultiEdit` | Single file / Batch file edits |
| Memory & Context | `mcp__serena__read_memory` | `mcp__serena__write_memory` | Recall project info / Store insights |

## Folder Structure

```
hellajs/
├── benchmarks/       # Framework performance benchmarks
│   ├── core/            # Core primitives benchmarks
│   ├── css/             # CSS-in-JS benchmarks  
│   ├── dom/             # DOM manipulation benchmarks
│   ├── resource/        # Data fetching benchmarks
│   ├── router/          # Client routing benchmarks
│   └── store/           # State management benchmarks
├── docs/             # Documentation website (Astro)
│   ├── src/             # Documentation source
│   │   ├── components/    # Astro components
│   │   ├── layouts/       # Page layouts
│   │   ├── pages/         # Content pages
│   │   │   ├── learn/       # Learning materials
│   │   │   │   ├── concepts/      # Core concepts
│   │   │   │   ├── migrating/     # Migration guides
│   │   │   │   └── tutorials/     # Step-by-step tutorials
│   │   │   ├── plugins/         # Plugin documentation
│   │   │   └── reference/       # API reference
│   │   │       ├── core/          # Core API docs
│   │   │       ├── css/           # CSS API docs
│   │   │       ├── dom/           # DOM API docs
│   │   │       ├── resource/      # Resource API docs
│   │   │       ├── router/        # Router API docs
│   │   │       └── store/         # Store API docs
│   │   └── types/         # TypeScript definitions
├── examples/          # Example applications
│   ├── bench/           # Benchmark example app
│   └── text-image/      # Text-to-image example app
├── packages/          # Framework source packages
│   ├── core/            # Reactive primitives (signals, effects, computed)
│   ├── css/             # CSS-in-JS system
│   ├── dom/             # DOM manipulation utilities
│   ├── resource/        # Data fetching and caching
│   ├── router/          # Client-side routing
│   └── store/           # State management
├── plugins/           # Build tool integrations
│   ├── babel/           # Babel JSX plugin
│   ├── rollup/          # Rollup JSX plugin
│   └── vite/            # Vite JSX plugin
├── scripts/           # Development and CI automation
│   └── utils/           # Shared utilities
├── tests/             # Test suites
│   ├── core/            # Core primitive tests
│   ├── css/             # CSS system tests
│   ├── dom/             # DOM utility tests
│   ├── resource/        # Resource system tests
│   ├── router/          # Router tests
│   ├── store/           # Store tests
│   └── utils/           # Test utilities
├── .changeset/        # Changeset configuration
└── .github/           # GitHub workflows and templates
 ├── hooks/              # Git hooks
 ├── instructions/       # Package-specific instructions
 └── workflows/          # CI/CD workflows
```

## Scripts 
**KEY INSTRUCTION:** ALWAYS use `bun` to run scripts, NEVER use `node` directly.

- `bun bundle [--all|<package>]` - Build packages
  - All: `bun bundle --all`
  - Single: `bun bundle core`
- `bun check [--all|<package>]` - Build & test packages
  - All: `bun bundle --all`
  - Single: `bun bundle core`
- `bun bench [--all|<package>]` - Benchmark packages
  - All: `bun bench`
  - Single: `bun bench core`
- `bun coverage` - Tests With coverage
- `bun clean` - Clean build artefacts
- `bun changeset` - Create changeset
- `bun validate` - Validate packages before release
- `bun release` - Publish to NPM
- `bun badges` - Generate badges
- `bun sync` - Sync LLM instruction files


## Reasoning Strategies

### First Principles Thinking
- Identify goals and/or problems
- Break tasks down to fundamental truths
- Question assumptions and challenge beliefs
- Do not rely on conventional wisdom
- Explore unexpected outcomes

### Decision-Making
- Explicitly state underlying beliefs
- Assess alternative approaches
- Consider contradictions
- Build arguments using strong logic and true premises
- Consider all available information
- Update reasoning when new information becomes available

### Drawing Conclusions
- Never leave a problem partially solved
- Ensure determinations are supported by facts
- Logical validity is valid or invalid; there is no middle ground


## Coding Guidelines

**KEY INSTRUCTION**: Write simple, powerful code. Start basic and add complexity only when necessary.

### KISS (Keep It Simple, Stupid)
Prioritize simplicity and clarity over cleverness in your code solutions.

### YAGNI (You Aren't Gonna Need It)
Implement only the features that are currently required, not those you think you might need.

### DRY (Don't Repeat Yourself)
Extract common logic into reusable functions or modules to avoid code duplication.

### Self-Documenting Code
Write code that clearly expresses its intent through naming and structure, reducing the need for comments.

### Avoid inline comments
Never pollute the code with inline comments describing what changes you've made.

### Avoid Premature Optimization
Focus on correctness and clarity first, then optimize only when performance bottlenecks are identified and measured.

### Functional Programming
Favor pure functions without side effects and immutable data structures when possible.

### Test-Driven Development
Write tests that define expected behavior before implementing functionality.

