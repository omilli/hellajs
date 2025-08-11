# CLAUDE.md - @hellajs/store

This file provides guidance to Claude Code when working with the state management package.

## Package Overview

@hellajs/store provides state management utilities for HellaJS applications. It offers reactive stores with immutable update patterns, nested reactivity, and granular change detection for efficient state management.

## When to Use

- Managing global application state across multiple components
- Creating reactive data stores with nested object and array support
- Implementing state management patterns like Redux or Zustand with reactive primitives
- Building applications that need granular state updates without full re-renders
- Sharing reactive state between different parts of the application

## Key Components

### Core Functions
- **store()**: Creates a reactive store with immutable update patterns and nested reactivity

## File Structure

- `store.ts` - Main store implementation with reactive state management
- `types.ts` - TypeScript type definitions for store interfaces
- `index.ts` - Package exports and public API

## Development Commands

From repository root:
- **Build**: `bun bundle store`
- **Test**: `bun test tests/store.test.js`
- **Build all**: `bun bundle --all` (builds core first, then store)

## Dependencies

- **@hellajs/core** - Uses reactive primitives for state reactivity

## Architecture Patterns

1. **Reactive state management**: Store values are reactive signals that automatically trigger updates
2. **Immutable update patterns**: State changes follow immutable patterns to prevent bugs
3. **Nested reactivity**: Deep object properties maintain reactivity at all levels
4. **Granular updates**: Only components using changed state properties re-render
5. **Type safety**: Full TypeScript support for store state and update methods