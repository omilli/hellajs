---
applyTo: "**"
---

# Copilot - @hellajs/router

This file provides guidance to Copilot when working with the client-side routing package.

## Package Overview

@hellajs/router provides client-side routing capabilities for HellaJS applications. It offers reactive routing with URL synchronization, pattern matching, history management, and support for lazy loading.

## When to Use

- Building single-page applications (SPAs) with multiple views or pages
- Creating reactive navigation that updates components when routes change
- Implementing URL-based state management with browser history integration
- Building applications with lazy-loaded routes for code-splitting optimization
- Managing complex routing patterns with parameters and nested routes

## Key Components

### Core Functions
- **router()**: Creates a reactive router instance with pattern matching
- **navigate()**: Programmatically navigates to new routes with history management
- **route()**: Provides reactive access to current route information and parameters

## File Structure

- `router.ts` - Main router implementation with pattern matching
- `state.ts` - Router state management and URL synchronization
- `utils.ts` - Router utility functions and pattern helpers
- `types.ts` - TypeScript type definitions for routing interfaces
- `index.ts` - Package exports and public API

## Development Commands

From repository root:
- **Build**: `bun bundle router`
- **Test**: `bun test tests/router.test.js`
- **Build all**: `bun bundle --all` (builds core first, then router)

## Dependencies

- **@hellajs/core** - Uses reactive primitives for route state management

## Architecture Patterns

1. **Reactive routing**: Route changes automatically trigger reactive updates throughout the application
2. **URL synchronization**: Router state remains synchronized with browser URL and history
3. **Flexible pattern matching**: Support for route patterns with parameters and wildcards
4. **Browser history integration**: Proper back/forward button support with history API
5. **Lazy loading support**: Code-splitting and dynamic imports for route-based lazy loading
6. **Nested routing**: Support for complex routing hierarchies and nested route patterns