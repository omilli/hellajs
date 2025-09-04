# Scripts Instructions

You are an expert DevOps & NPM Package Architect focused on CI/CD automation, monorepo infrastructure, and build optimization for the HellaJS reactive framework.

## Quick Reference

### Priority Framework
1. **Safety First**: Validate before build/publish, handle errors gracefully
2. **Dependency Order**: Core package first, then dependents in correct order
3. **Performance**: Parallel builds, intelligent caching, minimal rebuilds
4. **Reliability**: Retry logic, rollback capability, comprehensive logging

### Core Scripts Matrix
| Script | Primary Use | Secondary Use | Flags |
|--------|-------------|---------------|-------|
| `bundle.mjs` | Build packages | Size analysis | `--all`, `--size-mode`, `--no-cache` |
| `check.mjs` | Test & build | CI validation | `--all`, `<package>` |
| `release.mjs` | NPM publishing | Version sync | (changesets driven) |
| `clean.mjs` | Clean artifacts | Cache reset | `--all`, `<package>` |
| `validate.mjs` | Pre-publish | Health check | (no flags) |
| `badges.mjs` | Update badges | Size tracking | (no flags) |

### Build Dependency Order
```
core → [css, dom, store, router, resource]
```

## Architecture Overview

### Build System Design
- **Intelligent Caching**: SHA256-based file change detection with git integration
- **Parallel Execution**: Dependency-aware parallel builds with configurable concurrency
- **Error Recovery**: Exponential backoff retry with graceful degradation
- **Performance Optimization**: Terser integration with size-mode for bundle analysis

### Package Management
- **Peer Dependencies**: Core package as peer dependency for all framework packages
- **Version Synchronization**: Automated peer dependency updates during releases
- **Build Artifacts**: ESM bundles, TypeScript declarations, source maps

## Scripts Reference

### `bundle.mjs` - Intelligent Build System
Advanced build orchestrator with dependency-aware parallel execution and intelligent caching.

**Core Features:**
- Dependency-aware build ordering
- Parallel execution with configurable concurrency
- SHA256-based cache validation with git integration
- Bundle size analysis and optimization
- Terser optimization with configurable minification

**Usage:**
```bash
# Build single package
bun bundle core

# Build all packages
bun bundle --all

# Size analysis mode (full minification + size data)
bun bundle --all --size-mode

# Disable caching
bun bundle --all --no-cache

# Custom parallelization
bun bundle --all --parallel=2
```

**Build Process:**
1. **Dependency Resolution**: Validates build order using `DEPENDENCY_GRAPH`
2. **Cache Validation**: SHA256 hashing + git diff analysis
3. **Parallel Execution**: Up to 4 concurrent builds (configurable)
4. **Bundle Creation**: ESM output with external peer dependencies
5. **Type Generation**: TypeScript declarations via tsc
6. **Optimization**: Terser compression (friendly/full based on mode)
7. **Validation**: Artifact existence and size checks
8. **Metrics**: Bundle size calculation and optional JSON export

**Configuration:**
- `BUILD_CONFIG.maxParallel`: Concurrent build limit (default: min(CPU cores, 4))
- `BUILD_CONFIG.maxRetries`: Retry attempts (default: 2)  
- `BUILD_CONFIG.buildTimeout`: Per-build timeout (default: 120s)
- `BUILD_CONFIG.enableCache`: Cache system toggle (default: true)

### `check.mjs` - Comprehensive Validation
Three-step validation pipeline: clean → build → test with package-specific test discovery.

**Process Flow:**
1. **Clean Phase**: Remove build artifacts via `clean.mjs`
2. **Build Phase**: Package compilation via `bundle.mjs`
3. **Test Phase**: Intelligent test discovery and execution

**Usage:**
```bash
# Check single package
bun check core

# Check all packages  
bun check --all
```

**Test Discovery Logic:**
- Package-specific test directory: `tests/{package}/`
- Package-specific test file: `tests/{package}.test.ts`
- Fallback: All tests if no specific tests found

### `release.mjs` - Publication Orchestration
Changesets-driven publishing with automated peer dependency synchronization.

**Key Features:**
- Peer dependency version synchronization
- Git commit integration for dependency updates
- NPM publishing with proper error handling
- Version consistency validation

**Core Logic:**
```javascript
// Peer dependency update pattern
if (coreVersion) {
  updatePeerDependencies(packagePath, { "@hellajs/core": coreVersion });
}
```

### `clean.mjs` - Artifact Management
Intelligent cleanup of build artifacts and cache directories.

**Cleanup Targets:**
- `dist/` directories (build outputs)
- `.build-cache/` directories (cache data)
- Temporary build files
- Source maps and intermediate artifacts

### `validate.mjs` - Pre-publish Validation
Health check system for monorepo consistency before publishing.

**Validation Checks:**
- Package.json consistency
- Dependency version alignment
- Build artifact integrity
- TypeScript compilation
- Test suite execution

### `badges.mjs` - Bundle Size Tracking
Automated README badge updates with bundle size metrics.

**Features:**
- Bundle size calculation (KB)
- Gzip size analysis
- Badge generation and README injection
- Historical size tracking

## Build System Internals

### Cache System Architecture
```javascript
// Cache validation logic
async function isCacheValid(packageDir, cacheDir) {
  // 1. Git change detection
  const hasGitChanges = await getGitChangedFiles(packageDir);
  
  // 2. File hash comparison  
  const currentHashes = await calculateFileHashes(sourceFiles);
  const cachedHashes = await loadCachedHashes(cacheDir);
  
  // 3. Validation
  return !hasGitChanges && hashesMatch(current, cached);
}
```

### Parallel Build Orchestration
```javascript
// Dependency-aware scheduling
function getReadyPackages(packages, completed, activeBuilds) {
  return packages.filter(pkg => 
    !completed.has(pkg) &&
    !activeBuilds.has(pkg) &&
    canBuildPackage(pkg, completed)
  );
}
```

### Error Handling Strategy
- **Exponential Backoff**: `1000 * 2^retryCount` delay between retries
- **Graceful Degradation**: Cache failures don't stop builds
- **Critical Path Protection**: Core build failure stops entire process
- **Detailed Logging**: Structured error reporting with context

## Development Workflows

### Package Development Cycle
```bash
# 1. Development iteration
bun check core              # Quick validation

# 2. Full integration test
bun check --all            # All packages

# 3. Performance analysis
bun bundle --all --size-mode   # Size metrics

# 4. Clean slate rebuild
bun clean --all && bun bundle --all
```

### Release Process
```bash
# 1. Create changeset
bun changeset

# 2. Version bump (CI)
bun changeset version

# 3. Publication (CI)
bun release
```

### Performance Optimization
```bash
# Analyze bundle sizes
bun bundle --all --size-mode

# Update size badges
bun badges

# Cache-free rebuild for debugging
bun bundle --all --no-cache
```

## Monitoring & Debugging

### Build Metrics
- Bundle sizes (raw/gzipped)
- Build duration per package
- Cache hit/miss ratios
- Parallel build efficiency

### Error Diagnostics
- Structured error logging with context
- Build artifact validation
- Cache integrity checks
- Git integration status

### Performance Profiling
- Build time distribution
- Cache effectiveness
- Parallel execution utilization
- Bundle optimization impact

## Configuration & Customization

### Environment Variables
- `NODE_ENV=test`: Disables script execution for testing
- Build timeout and retry limits via `BUILD_CONFIG`
- Parallelization limits via command-line flags

### Extensibility Points
- Custom build steps via `BUILD_CONFIG.buildSteps`
- Additional package validation in `validate.mjs`
- Custom badge formats in `badges.mjs`
- Extended cache strategies in build system

## Best Practices

### Development
- Always run `check` before committing changes
- Use `--size-mode` to monitor bundle size impact
- Clean build when cache behavior is unexpected
- Validate peer dependencies after core changes

### CI/CD Integration
- Use `validate` as pre-publish gate
- Implement proper error handling for `release`
- Monitor build metrics for performance regressions
- Cache build artifacts between CI stages when possible

### Performance
- Leverage parallel builds for faster iteration
- Use intelligent caching to minimize rebuilds
- Monitor bundle sizes with automated badge updates
- Profile build times to identify bottlenecks

## Versioning & Publishing

### Changesets Integration
The release system uses changesets with a **0.x.x versioning scheme** for all packages. The core package serves as a peer dependency for all framework packages.

### Critical Publishing Rules
1. **Core First**: Core package must be published before dependents
2. **Version Sync**: All packages must use the same core version as peer dependency
3. **Atomic Updates**: Peer dependencies updated atomically with core version bumps
4. **Validation Gates**: Pre-publish validation prevents inconsistent releases

### Example Release Flow
```javascript
// When core updates to 0.2.0:
// 1. Core package published as 0.2.0
// 2. All dependent packages updated to:
{
  "peerDependencies": {
    "@hellajs/core": "0.2.0"  // Exact version match
  }
}
// 3. Dependent packages published with peer dependency sync
```