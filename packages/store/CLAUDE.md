# CLAUDE.md - @hellajs/store

This file provides guidance to Claude Code when working with the store package.

## Package Overview

@hellajs/store provides state management utilities for HellaJS applications. It offers reactive stores for managing application state.

## Key Components

### Core Functions
- **store()**: Creates a reactive store for state management

### Files Structure
- `store.ts` - Main store implementation
- `types.ts` - TypeScript type definitions
- `index.ts` - Package exports

## Build Commands

From repository root:
- **Build store**: `bun bundle store`
- **Test store**: `bun test tests/store.test.js`

## Dependencies

- Depends on: @hellajs/core

## Key Patterns

1. **Reactive state**: Store values are signals that trigger updates
2. **Immutable updates**: State updates follow immutable patterns
3. **Nested reactivity**: Deep object properties can be reactive
4. **Performance**: Granular updates only where state actually changed