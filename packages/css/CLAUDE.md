# CLAUDE.md - @hellajs/css

This file provides guidance to Claude Code when working with the CSS package.

## Package Overview

@hellajs/css provides CSS-in-JS utilities for HellaJS applications. It enables reactive styling and CSS variable management.

## Key Components

### Core Functions
- **css()**: Creates CSS-in-JS styles with reactive capabilities
- **cssVars()**: Manages CSS custom properties reactively
- **cssState()**: Manages CSS state and transitions

### Files Structure
- `css.ts` - Main CSS-in-JS implementation
- `vars.ts` - CSS custom properties management
- `state.ts` - CSS state management
- `utils.ts` - CSS utility functions
- `types.ts` - TypeScript type definitions

## Build Commands

From repository root:
- **Build css**: `bun bundle css`
- **Test css**: `bun test tests/css.test.js`

## Dependencies

- Depends on: @hellajs/core

## Key Patterns

1. **Reactive styling**: CSS properties can be bound to signals
2. **CSS variables**: Dynamic CSS custom properties
3. **State-based styling**: CSS changes based on component state
4. **Performance**: Minimal style recalculation when signals change