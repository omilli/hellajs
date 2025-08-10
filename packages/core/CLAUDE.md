# CLAUDE.md - @hellajs/core

This file provides guidance to Claude Code when working with the core package.

## Package Overview

@hellajs/core is the foundational reactive system for HellaJS. It provides fine-grained reactivity primitives including signals, effects, computed values, and batching.

## Key Components

### Core Primitives
- **signal()**: Creates reactive values that track dependencies
- **effect()**: Runs side-effects when signal dependencies change
- **computed()**: Derives values that update when dependencies change
- **batch()**: Batches multiple updates to prevent cascading effects
- **untracked()**: Runs code without tracking dependencies

### Files Structure
- `signal.ts` - Signal primitive implementation
- `effect.ts` - Effect system for side-effects
- `computed.ts` - Computed values derived from signals
- `batch.ts` - Batching system for updates
- `untracked.ts` - Utility for untracked execution
- `tracking.ts` - Dependency tracking utilities
- `reactive.ts` - Core reactive system
- `types.ts` - TypeScript type definitions

## Build Commands

From repository root:
- **Build core**: `bun bundle core`
- **Test core**: `bun test tests/core/`

## Dependencies

This is the foundation package - all other HellaJS packages depend on @hellajs/core.

## Key Patterns

1. **Fine-grained reactivity**: Only affected computations update when signals change
2. **Automatic dependency tracking**: Effects automatically track signal dependencies
3. **Batching**: Multiple signal updates are batched to prevent unnecessary re-runs
4. **Memory management**: Proper cleanup of effects and computations