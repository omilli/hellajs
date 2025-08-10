# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository. Use serena where possible.

## Overview

HellaJS is a reactive client-side framework for building web interfaces. It's a monorepo with multiple packages that provide modular functionality including reactivity, DOM manipulation, routing, and more.

## Development Commands

- **Build all packages**: `bun bundle --all` (builds in dependency order: core → dom → store → router → resource)
- **Build single package**: `bun bundle <package-name>` (e.g., `bun bundle core`)
- **Run tests**: `bun test` (uses Bun test runner with HappyDOM)
- **Run tests with coverage**: `bun coverage`
- **Check (build + test)**: `bun check`
- **Lint**: `bun lint` (uses Biome)
- **Format**: `bun format` (uses Biome with `--write`)

### Publishing Commands

- **Dry run release**: `bun run release:dry` (shows what would be published without making changes)
- **Create changeset**: `bun run changeset` (interactive prompt to document changes)
- **Version packages**: `bun run changeset:version` (applies changesets and updates versions with peer dep management)
- **Publish packages**: `bun run changeset:publish` (builds, tests, and publishes to npm with peer dependency management)
- **Check changeset status**: `bun run changeset:status` (shows which packages have changesets)
- **Release workflow**: Automated via GitHub Actions on push to master with changesets

## Architecture

### Core Concepts
- **Signals**: Fine-grained reactive primitives (`signal()`) that track dependencies and trigger updates
- **Effects**: Side-effects that run when their signal dependencies change (`effect()`)
- **Computed**: Derived state that updates when dependencies change (`computed()`)
- **Batching**: Updates are batched to prevent cascading effects

### Package Structure
- **@hellajs/core**: Reactive system foundation (signals, effects, computed)
- **@hellajs/dom**: DOM manipulation and JSX support (mount, events, cleanup)
- **@hellajs/css**: CSS-in-JS utilities
- **@hellajs/resource**: Data fetching primitives
- **@hellajs/router**: Client-side routing
- **@hellajs/store**: State management

### Build Tool Plugins
- **babel-plugin-hellajs**: Babel plugin for JSX transformation and optimization
- **rollup-plugin-hellajs**: Rollup plugin for bundling HellaJS applications
- **vite-plugin-hellajs**: Vite plugin for development and building

### Key Patterns
1. **Granular Reactivity**: Only elements with reactive attributes/text update when signals change
2. **Automatic Cleanup**: Components auto-cleanup when removed from DOM via node registry
3. **Event Delegation**: Events are delegated to mount element for performance
4. **Modern Build Targets**: Each package builds to optimized ESM bundle + TypeScript declarations targeting Node 18+ and modern browsers

### File Organization
- Each package has `lib/` (source), `dist/` (built), and `README.md`
- Tests are in `/tests/` with package-specific subdirectories
- Build scripts in `/scripts/` handle bundling and publishing
- Examples in `/examples/` and build tool plugins in `/plugins/`

## Build System

Uses Bun as the build tool with modern bundling script optimized for latest environments. Build order matters - core must be built first as other packages depend on it.

### Bundle Output (per package)
- **Single ESM bundle**: Minified, optimized for Node 18+ and modern browsers (Chrome 91+, Safari 14+, Firefox 89+)
- **TypeScript declarations**: Complete type definitions for TypeScript users
- **Modern targets only**: Legacy formats removed for optimal performance and smaller bundles

## Testing

Uses Bun test runner with HappyDOM for DOM simulation. Test files use `.test.js` extension. Tests are organized by package in `/tests/` directory.

## Publishing System

Uses modern npm publishing practices with automated workflows:

### Changesets Workflow
1. **Make changes** to packages in the monorepo
2. **Create changeset** via `bun run changeset` (documents changes for changelog and versioning)
3. **Preview changes** via `bun run release:dry` (shows what would be published)
4. **Version packages** via `bun run changeset:version` (applies changesets and updates versions)
5. **Publish packages** via `bun run changeset:publish` (builds, tests, and publishes)
6. **Automated publishing** via GitHub Actions on push to master with changesets

### Security Features
- **npm provenance**: Supply chain attestations for all published packages
- **OIDC trusted publishing**: Passwordless publishing via GitHub Actions
- **Automated peer dependency bumping**: Ensures version consistency across packages

### Local Development
- Use `bun run release:dry` to preview what would be published
- Use `bun run changeset:publish` for manual publishing (builds, tests, and publishes with peer dependencies)
- Use `bun run changeset:status` to see which packages have pending changesets
- All packages follow 0.x.x versioning strategy for pre-1.0 development

# CLAUDE.md

## Code Style

- Uses Biome for linting and formatting
- Tab indentation, double quotes
- Conventional commits (enforced by commitlint)
- TypeScript with strict mode enabled

### KISS Principle

Keep It Simple, Stupid—solutions should be straightforward and uncomplicated. Avoid over-engineering and unnecessary complexity to ensure code remains readable and maintainable.

### YAGNI Principle

You Aren't Gonna Need It—implement only what is currently required. Avoid adding speculative features to reduce code bloat and maintenance overhead.

### SOLID Principles

- **Single Responsibility Principle**: Each module or function should have one responsibility.
- **Open-Closed Principle**: Code should be open for extension but closed for modification.
- **Liskov Substitution Principle**: Subtypes must be substitutable for their base types.
- **Interface Segregation Principle**: Prefer small, specific interfaces over large, general ones.
- **Dependency Inversion Principle**: Depend on abstractions, not concrete implementations.
