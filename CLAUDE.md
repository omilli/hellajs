# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- **Release**: `bun release` (runs publish script)

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
4. **Build Targets**: Each package builds to multiple formats (ESM, CJS, IIFE, minified)

### File Organization
- Each package has `lib/` (source), `dist/` (built), and `README.md`
- Tests are in `/tests/` with package-specific subdirectories
- Build scripts in `/scripts/` handle bundling and publishing
- Examples in `/examples/` and build tool plugins in `/plugins/`

## Build System

Uses Bun as the build tool with custom bundling script. Build order matters - core must be built first as other packages depend on it. Each package outputs:
- ESM modules (individual files + bundled)
- CJS bundle for Node.js
- IIFE global bundle for browsers
- Minified and gzipped versions
- TypeScript declarations

## Testing

Uses Bun test runner with HappyDOM for DOM simulation. Test files use `.test.js` extension. Tests are organized by package in `/tests/` directory.

## Code Style

- Uses Biome for linting and formatting
- Tab indentation, double quotes
- Conventional commits (enforced by commitlint)
- TypeScript with strict mode enabled