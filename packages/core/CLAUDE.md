# CLAUDE.md - @hellajs/core

This file provides guidance to Claude Code when working with the core reactive system package.

## Package Overview

@hellajs/core is the foundational reactive system for HellaJS. It provides fine-grained reactivity primitives including signals, effects, computed values, and batching for building reactive applications.

## When to Use

- Building reactive state management systems
- Creating computed values that derive from other reactive data
- Managing side effects that respond to state changes
- Implementing custom reactive primitives or higher-order reactive utilities
- Building other HellaJS packages (this is the foundation dependency)

## Key Components

### Core Primitives
- **signal()**: Creates reactive values that automatically track dependencies
- **effect()**: Executes side-effects when signal dependencies change
- **computed()**: Derives reactive values that update when dependencies change
- **batch()**: Batches multiple signal updates to prevent cascading re-runs
- **untracked()**: Executes code without establishing reactive dependencies

## File Structure

- `signal.ts` - Signal primitive implementation with dependency tracking
- `effect.ts` - Effect system for managing reactive side-effects
- `computed.ts` - Computed values derived from reactive signals
- `batch.ts` - Batching system for optimizing multiple updates
- `untracked.ts` - Utility for non-reactive code execution
- `tracking.ts` - Core dependency tracking utilities
- `reactive.ts` - Main reactive system orchestration
- `types.ts` - TypeScript type definitions and interfaces

## Development Commands

From repository root:
- **Build**: `bun bundle core`
- **Test**: `bun test tests/core/`
- **Build all**: `bun bundle --all` (includes core as first dependency)

## Dependencies

**No dependencies** - This is the foundation package that all other HellaJS packages depend on.

## Architecture Patterns

1. **Fine-grained reactivity**: Only affected computations update when specific signals change
2. **Automatic dependency tracking**: Effects and computed values automatically discover their dependencies
3. **Batched updates**: Multiple signal changes are batched to prevent unnecessary cascade re-runs
4. **Memory management**: Automatic cleanup of effects and computations to prevent memory leaks