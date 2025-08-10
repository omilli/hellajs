# CLAUDE.md - @hellajs/dom

This file provides guidance to Claude Code when working with the DOM package.

## Package Overview

@hellajs/dom provides DOM manipulation utilities and JSX support for HellaJS. It handles mounting, events, cleanup, and reactive DOM updates.

## Key Components

### Core Functions
- **mount()**: Mounts reactive components to the DOM
- **html()**: Template literal function for creating reactive HTML
- **forEach()**: Reactive list rendering
- **slot()**: Dynamic slot/placeholder rendering

### Files Structure
- `mount.ts` - Component mounting and lifecycle
- `html.ts` - HTML template literals and reactive rendering
- `forEach.ts` - Reactive list/array rendering
- `events.ts` - Event handling and delegation
- `cleanup.ts` - Automatic cleanup system
- `slot.ts` - Slot/placeholder utilities
- `utils.ts` - DOM utility functions
- `types/` - TypeScript definitions for attributes and nodes

## Build Commands

From repository root:
- **Build dom**: `bun bundle dom`
- **Test dom**: `bun test tests/dom/`

## Dependencies

- Depends on: @hellajs/core

## Key Patterns

1. **Granular updates**: Only elements with reactive content update when signals change
2. **Event delegation**: Events are delegated to the mount element for performance
3. **Automatic cleanup**: Components automatically clean up when removed from DOM
4. **JSX support**: Full JSX support with reactive attributes and children
5. **Memory management**: Node registry tracks mounted elements for cleanup