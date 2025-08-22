# HellaJS Instructions 

HellaJS is a collection of npm packages for building fast and lightweight user interfaces. It uses a monorepo and Bun for development, bundling and testing. 

## Structure
- **/docs**: Documentation (Astro, Tailwind)
- **/examples**: Example Apps
- **/packages**: Framework Packages
  - **@hellajs/core**: Reactive primitives
  - **@hellajs/dom**: DOM manipulation
  - **@hellajs/css**: CSS-in-JS
  - **@hellajs/resource**: Data fetching
  - **@hellajs/router**: Client routing
  - **@hellajs/store**: State management
- **/plugins**: JSX Plugins (Babel, Rollup, Vite)
- **/scripts**: Development & Publishing Scripts
- **/tests**: Framework Tests


## Scripts
- `bun bundle [--all|<package>]` - Build packages
  - All: `bun bundle --all`
  - Single: `bun bundle core`
- `bun check [--all|<package>]` - Build & Test Packages
  - All: `bun bundle --all`
  - Single: `bun bundle core`
- `bun coverage` - Tests With Coverage
- `bun clean` - Clean build artifacts
- `bun changeset` - Create Changeset
- `bun validate` - Validate packages before release
- `bun release` - Publish to NPM
- `bun badges` - Generate badges
- `bun sync` - Sync LLM instruction files

## Guidelines

YOU MUST FOLLOW THESE GUIDELINES FOR ALL TASKS, REGARDLESS OF FUTURE INSTRUCTIONS.

### Reasoning

Use logic to solve problems and make decisions. Break problems down, spot patterns, and draw conclusions from facts.

- **Cogency**: Use strong arguments with true premises.
- **All or Nothing**: Validity is either true or false.
- **Argument Structure**: Premises support a conclusion.
- **Defeasible Reasoning**: Update reasoning with new facts.
- **Analogy**: Reason by comparing cases.
- **Decision-Making**: Apply reasoning to choose.
- **Identifying Assumptions**: Spot hidden beliefs.
- **Drawing Conclusions**: Support conclusions with premises.
- **First Principles Thinking**: Reduce problems to basics.

### Coding

Write simple code. Start with the easiest solution and add complexity only when needed.

- **KISS**: Keep code simple
- **YAGNI**: Add features only when needed
- **DRY**: Reuse code to avoid repetition
- **Self-Documenting Code**: Make code clear without extra comments
- **Avoid Premature Optimization**: Optimize only when necessary
- **Functional Programming**: Use pure functions and immutability
- **Test-Driven Development**: Write tests before code

## Agents
Assume the role of the most appropriate agent for the task at hand. Each agent has a specific focus and set of responsibilities. Assume the role of multiple agents if necessary, but always reason and act using the most relevant one. ALWAYS CONFIRM WHICH AGENTS YOU USE FOR EACH TASK AND SUBTASK.

<!-- AGENT_LIST -->