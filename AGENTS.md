# Critical Instructions

**These instructions are CRITICAL to the success of the project. You MUST follow them, failure to do so is UNACCEPTABLE!**

**ALWAYS assume hyphenated words (e.g., "key-instructions") are references to an instruction you should search for within the current context.**

## Key Instructions

- **ALWAYS** pay special attention to key instructions before responding
- **ALWAYS** understand the folder structure and the relationships between different entities
- **ALWAYS** follow the response process when responding to a prompt
- **ALWAYS** follow the coding rules unless prompted otherwise
- **ALWAYS** follow the testing rules unless prompted otherwise
- **ALWAYS** check and execute the correct CI scripts
- **ALWAYS** follow the writing rules unless prompted otherwise
- **ALWAYS** assume core functions are globally available in test files
- **ALWAYS** run sync after commits via git hooks to keep AGENTS files in sync

## Folder Structure

**When creating files and folders, ALWAYS keep names short and relevant to their purpose. Avoid using more than a single word, and in super rare cases use a single hyphen to separate 2 words.**

### Monorepo

- **docs** - Documentation website
- **examples** - Example applications
  - **bench** - Benchmark example app
  - **text-image** - Text-to-image example app
- **packages**
  - **core** - Reactive primitives (signals, effects, computed)
  - **css** - CSS-in-JS system
  - **dom** - DOM manipulation utilities
  - **resource** - Data fetching and caching
  - **router** - Client-side routing
  - **store** - State management
- **plugins**
  - **babel** - Babel JSX plugin
  - **rollup** - Rollup JSX plugin
  - **vite** - Vite JSX plugin
- **scripts** - Development and CI automation
  - **utils** - Shared utilities
- **changeset** - Changeset configuration
- **github**
  - **hooks** - Git hooks
  - **instructions** - Package-specific instructions
  - **workflows** - CI/CD workflows

## CI Scripts

### Key Instructions

- **NEVER** assume what folder you will be in when executing a terminal command, always cd into the full path
- **ALWAYS** use `bun` to run scripts, **NEVER** use `node` directly
- **ALWAYS** use `bun bundle` after making changes, example apps and tests rely on dist files. **NEVER** run example apps without bundling packages
- **ALWAYS** use `bun check` to run tests, **NEVER** use `bun test` directly

### Scripts

- **Build packages** - `bun bundle [--all|package]`
- **Build all** - `bun bundle --all`
- **Build single** - `bun bundle core`
- **Test coverage** - `bun coverage`
- **Clean** - `bun clean`
- **Changeset** - `bun changeset`
- **Release** - `bun release`
- **Sync** - `bun sync`

## Response Checklist

### Pre-Answer Checklist

- Have I (re-)read all the important context instruction files?
- Have I fully understood the task requirements?
- Do I need to ask for clarification?
- Have I made any assumptions?
- Have I contradicted myself?
- Have I broken this task down into enough detailed sub-tasks?
- Does the sum of the detailed sub-tasks match the big picture?
- Which tools do I need for each requirement?
- Which tracking files should I create or update?
- Have I gathered all the important files for context?
- What scripts should I run?

### Post-Answer Checklist

- Have I tested the solution in a way that matches the expected outcome?
- Have I cleaned up any .tmp code files that are no longer required?
- Have I fully documented any changes in package README.md, CLAUDE.md or relevant /docs pages?

## Code Priorities

- **Execution speed** - **HEAVILY** optimize control flow and syntax for speed **ABOVE ALL ELSE**, pay special attention to loops and always use the fastest possible syntax
- **Fast paths** - Identify and optimize critical or most used code paths for maximum performance
- **Memory footprint** - Reduce memory usage by minimizing (re)allocations and leveraging in-place updates
- **Test coverage** - Aim for 100% test coverage, only ultra defensive edge cases should be unreachable

## Coding Guidelines

- **Loop choice** - **ALWAYS** use the fastest loops possible, prefer while/for loops with cached variables
- **Ternary use** - **ALWAYS** use ternary operators for simple conditionals
- **Logical operators** - **ALWAYS** use `&&` and `||` for simple conditionals
- **Excess curly** - **ALWAYS** remove excess single line curly braces
- **Naming conventions** - **ALWAYS** use simple camelCase for variables and functions and UPPER_SNAKE_CASE for constants. Stick to simple single word names where possible

## Writing Guidelines

- **Content clarity** - **ALWAYS** prioritize clarity and simplicity in explanations, avoid jargon and complex sentences
- **Content conciseness** - **ALWAYS** be concise, remove unnecessary words or redundant information
- **Content consistency** - **ALWAYS** maintain consistent terminology and formatting throughout the documentation
- **Code examples** - **ALWAYS** include relevant code examples to illustrate concepts clearly
- **Content structure** - **ALWAYS** use consistent headings, subheadings, and bullet points to organize content logically
- **Technical accuracy** - **ALWAYS** ensure all technical details are accurate and up-to-date with the latest codebase
- **Content review** - **ALWAYS** proofread for grammar, spelling, and punctuation errors before finalizing the documentation
- **JSDoc comments** - **ALWAYS** ensure JSDoc comments are clear, accurate, and follow standard conventions. Show only @: params, generics and returns
