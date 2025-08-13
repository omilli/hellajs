# HellaJS Instructions 

Follow these instructions when working in this repository. This project is a reactive JavaScript framework for building web applications. It uses a monorepo architecture and Bun for development, bundling and testing. 

### Structure
- **/docs**: Documentation (Astro, Tailwind)
- **/examples**: Example Apps
- **/packages**: Framework Packages
- **/plugins**: JSX Plugins (Babel, Rollup, Vite)
- **/scripts**: Development & Publishing Scripts
- **/tests**: Framework Tests

### Packages
- **@hellajs/core**: Reactive primitives
- **@hellajs/dom**: DOM manipulation
- **@hellajs/css**: CSS-in-JS
- **@hellajs/resource**: Data fetching
- **@hellajs/router**: Client routing
- **@hellajs/store**: State management

## Development
- `bun lint` - Lint With Biome
- `bun format` - Format With Biome
- `bun bundle --all` - Build All Packages
- `bun bundle <package>` - Build Single Package
- `bun test` - Run Tests (Bundle first)
- `bun coverage` - Tests With Coverage
- `bun check` - Build & Test

## Publishing
- `bun run changeset` - Create Changeset
- `bun run changeset:version` - Update Versions
- `bun run changeset:publish` - Publish to NPM
- `bun run changeset:status` - Check Status

## Syncing Instructions
- `bun sync` - Syncs instruction files using Claude.md as the source.