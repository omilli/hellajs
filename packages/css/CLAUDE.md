# CLAUDE.md - @hellajs/css

This file provides guidance to Claude Code when working with the CSS-in-JS utilities package.

## Package Overview

@hellajs/css provides CSS-in-JS utilities for HellaJS applications. It enables reactive styling, dynamic CSS custom properties, and state-based styling with minimal performance overhead.

## When to Use

- Creating dynamic styles that respond to application state changes
- Managing CSS custom properties (CSS variables) reactively
- Building theme systems with reactive color schemes and typography
- Implementing conditional styling based on component state
- Creating CSS-in-JS solutions that integrate with HellaJS reactivity

## Key Components

### Core Functions
- **css()**: Creates CSS-in-JS styles with reactive signal integration
- **cssVars()**: Manages CSS custom properties that update reactively

## File Structure

- `css.ts` - Main CSS-in-JS implementation with reactive bindings
- `vars.ts` - CSS custom properties management and utilities
- `state.ts` - CSS state management for dynamic styling
- `utils.ts` - CSS utility functions and helpers
- `types.ts` - TypeScript type definitions for CSS utilities

## Development Commands

From repository root:
- **Build**: `bun bundle css`
- **Test**: `bun test tests/css.test.js`
- **Build all**: `bun bundle --all` (builds core first, then css)

## Dependencies

- **@hellajs/core** - Uses reactive primitives for dynamic styling

## Architecture Patterns

1. **Reactive styling**: CSS properties dynamically bound to reactive signals
2. **CSS custom properties**: Dynamic CSS variables that update automatically
3. **State-based styling**: CSS changes triggered by component state transitions
4. **Performance optimization**: Minimal style recalculation through granular reactivity
5. **Type safety**: Full TypeScript support for CSS properties and values