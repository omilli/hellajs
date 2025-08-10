# CLAUDE.md - Build Tool Plugins

This file provides guidance to Claude Code when working with HellaJS build tool plugins.

## Overview

The plugins directory contains build tool integrations for HellaJS that enable JSX transformation and framework-specific optimizations across different build systems.

## Available Plugins

### babel-plugin-hellajs
- **Package**: `babel-plugin-hellajs`
- **Purpose**: Babel plugin for JSX transformation and HellaJS optimizations
- **Location**: `/plugins/babel/`
- **Main file**: `index.mjs`
- **Dependencies**: `@babel/core`, `@babel/plugin-syntax-jsx`, `@babel/traverse`, `@babel/types`

### rollup-plugin-hellajs  
- **Package**: `rollup-plugin-hellajs`
- **Purpose**: Rollup plugin for bundling HellaJS applications
- **Location**: `/plugins/rollup/`
- **Main file**: `index.mjs`
- **Dependencies**: `@babel/core`, `babel-plugin-hellajs`, `@babel/preset-typescript`

### vite-plugin-hellajs
- **Package**: `vite-plugin-hellajs`
- **Purpose**: Vite plugin for development and building HellaJS apps
- **Location**: `/plugins/vite/`
- **Main file**: `index.mjs`
- **Dependencies**: `@babel/core`, `babel-plugin-hellajs`, `@babel/preset-typescript`

## Key Features

1. **JSX Transformation**: All plugins handle HellaJS-specific JSX transformation
2. **TypeScript Support**: Built-in TypeScript support and type definitions
3. **Development Integration**: Seamless integration with popular build tools
4. **Framework Optimization**: HellaJS-specific optimizations during build

## Build Commands

From repository root:
- **Build babel plugin**: `cd plugins/babel && bun install`
- **Build rollup plugin**: `cd plugins/rollup && bun run bundle`
- **Build vite plugin**: `cd plugins/vite && bun run bundle`

## Usage Examples

Each plugin includes a README.md with specific usage instructions for integrating with the respective build tool.

## Dependencies

All plugins depend on the core babel-plugin-hellajs for JSX transformation logic. The rollup and vite plugins are essentially wrappers that integrate the babel plugin with their respective build systems.