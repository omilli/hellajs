# Gemini - @hellajs/resource

This file provides guidance to Gemini when working with the data fetching primitives package.

## Package Overview

@hellajs/resource provides reactive data fetching primitives for HellaJS applications. It offers automatic caching, loading states, error handling, and suspense-like patterns for efficient data management.

## When to Use

- Fetching data from APIs with reactive loading and error states
- Implementing data caching to prevent unnecessary network requests
- Creating suspense-like loading patterns for better user experience
- Building applications that need automatic refetching when dependencies change
- Managing complex async data workflows with proper error boundaries

## Key Components

### Core Functions
- **resource()**: Creates a reactive resource with automatic caching, loading states, and error handling

## File Structure

- `resource.ts` - Main resource implementation with reactive data fetching
- `types.ts` - TypeScript type definitions for resource interfaces
- `index.ts` - Package exports and public API

## Development Commands

From repository root:
- **Build**: `bun bundle resource`
- **Test**: `bun test tests/resource.test.js`
- **Build all**: `bun bundle --all` (builds core first, then resource)

## Dependencies

- **@hellajs/core** - Uses reactive primitives for data state management

## Architecture Patterns

1. **Reactive data fetching**: Resources are reactive signals that update when data changes
2. **Built-in loading states**: Automatic loading, error, and success state management
3. **Intelligent caching**: Automatic caching with configurable invalidation to prevent unnecessary requests
4. **Suspense integration**: Supports suspense-like patterns for declarative loading UI
5. **Error boundaries**: Comprehensive error handling and recovery mechanisms
6. **Dependency tracking**: Automatic refetching when reactive dependencies change