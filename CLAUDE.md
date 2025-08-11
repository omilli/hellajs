# CLAUDE.md

Instructions for Claude Code when working with this repository.

## Guidelines
- Always Use appropriate sub-agents for different tasks
- Always Use Serena MCP for file system operations
- Try to Keep solutions simple and avoid over-engineering
- Always Implement only what's needed to complete the task
- Avoid backwards compatibility unless explicitly required

## Overview

HellaJS is a reactive client-side framework. Monorepo using Bun.

### Structure
- **/docs**: Documentation
- **/examples**: Example apps (bench, text-image)
- **/packages**: Core framework packages
- **/plugins**: JSX build plugins (babel, rollup, vite)
- **/scripts**: Build/publish scripts
- **/tests**: Tests

### Packages
- **@hellajs/core**: Reactive primitives
- **@hellajs/dom**: DOM manipulation
- **@hellajs/css**: CSS-in-JS
- **@hellajs/resource**: Data fetching
- **@hellajs/router**: Client routing
- **@hellajs/store**: State management

## Commands

### Development
- `bun bundle --all` - Build all packages (dependency order: core → css → dom → store → router → resource)
- `bun bundle <package>` - Build single package
- `bun test` - Run tests (requires build first)
- `bun coverage` - Tests with coverage
- `bun check` - Build + test
- `bun lint` - Lint with Biome
- `bun format` - Format with Biome

### Publishing
- `bun run release:dry` - Preview release
- `bun run changeset` - Create changeset
- `bun run changeset:version` - Update versions
- `bun run changeset:publish` - Publish to npm
- `bun run changeset:status` - Check status

## Syncing LLM Files
- `bun sync` - Syncs instruction files when any Claude.md file changes

## Build System
- Build `core` first (dependency for other packages)
- Output: Single ESM bundle, TypeScript declarations, source maps
- Target: Node 18+, modern browsers

## Testing
- Uses Bun test runner with HappyDOM
- Test files: `*.test.js` in `/tests` directory
- **Must build packages before testing**