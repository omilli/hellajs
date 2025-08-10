# CLAUDE.md - @hellajs/router

This file provides guidance to Claude Code when working with the router package.

## Package Overview

@hellajs/router provides client-side routing capabilities for HellaJS applications. It offers reactive routing with URL synchronization.

## Key Components

### Core Functions
- **router()**: Creates a reactive router instance
- **Route matching**: Pattern-based route matching
- **Navigation**: Programmatic navigation utilities

### Files Structure
- `router.ts` - Main router implementation
- `state.ts` - Router state management
- `utils.ts` - Router utility functions
- `types.ts` - TypeScript type definitions
- `index.ts` - Package exports

## Build Commands

From repository root:
- **Build router**: `bun bundle router`
- **Test router**: `bun test tests/router.test.js`

## Dependencies

- Depends on: @hellajs/core

## Key Patterns

1. **Reactive routing**: Route changes trigger reactive updates
2. **URL synchronization**: Router state stays in sync with browser URL
3. **Pattern matching**: Flexible route pattern matching with parameters
4. **History management**: Proper browser history integration
5. **Lazy loading**: Support for code-splitting and lazy route loading