# CLAUDE.md - @hellajs/resource

This file provides guidance to Claude Code when working with the resource package.

## Package Overview

@hellajs/resource provides data fetching primitives for HellaJS applications. It offers reactive data loading with caching and error handling.

## Key Components

### Core Functions
- **resource()**: Creates a reactive resource for data fetching

### Files Structure
- `resource.ts` - Main resource implementation
- `types.ts` - TypeScript type definitions
- `index.ts` - Package exports

## Build Commands

From repository root:
- **Build resource**: `bun bundle resource`
- **Test resource**: `bun test tests/resource.test.js`

## Dependencies

- Depends on: @hellajs/core

## Key Patterns

1. **Reactive data fetching**: Resources are signals that update when data changes
2. **Loading states**: Built-in loading, error, and success state management
3. **Caching**: Automatic caching to prevent unnecessary requests
4. **Suspense-like**: Supports suspense-like patterns for loading states
5. **Error boundaries**: Proper error handling and recovery