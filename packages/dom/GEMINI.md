# Gemini - @hellajs/dom

This file provides guidance to Gemini when working with the DOM manipulation and JSX package.

## Package Overview

@hellajs/dom provides DOM manipulation utilities and JSX support for HellaJS applications. It handles component mounting, event delegation, automatic cleanup, and reactive DOM updates with granular precision.

## When to Use

- Building web applications with reactive user interfaces
- Mounting HellaJS components to the DOM with automatic lifecycle management
- Creating dynamic lists that efficiently update when data changes
- Implementing event handling with optimized delegation patterns
- Building JSX-based components with reactive attributes and content

## Key Components

### Core Functions
- **mount()**: Mounts reactive components to DOM elements with lifecycle management
- **forEach()**: Efficiently renders reactive lists with minimal DOM manipulation
- **slot()**: Defines content projection slots for component composition

## File Structure

- `mount.ts` - Component mounting system and lifecycle management
- `forEach.ts` - Reactive list rendering with efficient diff algorithms
- `events.ts` - Event handling system with automatic delegation
- `cleanup.ts` - Automatic cleanup system for memory management
- `utils.ts` - DOM utility functions and helpers
- `types/` - TypeScript definitions for DOM attributes and node types

## Development Commands

From repository root:
- **Build**: `bun bundle dom`
- **Test**: `bun test tests/dom/`
- **Build all**: `bun bundle --all` (builds core first, then dom)

## Dependencies

- **@hellajs/core** - Uses reactive primitives for DOM updates

## Architecture Patterns

1. **Granular DOM updates**: Only DOM elements with reactive content update when signals change
2. **Event delegation**: All events are delegated to mount elements for optimal performance
3. **Automatic cleanup**: Components automatically clean up resources when removed from DOM
4. **JSX integration**: Full JSX support with reactive attributes, children, and event handlers
5. **Node registry**: Tracks mounted elements for proper lifecycle and memory management