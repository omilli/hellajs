# Changelog

## [0.7.9](https://github.com/omilli/hellajs/compare/v0.7.8...v0.7.9) (2025-05-29)


### Bug Fixes

* **mount:** add support for mounting raw HTML strings ([ee5fc42](https://github.com/omilli/hellajs/commit/ee5fc42712ae1352e762ac5b58183fff43652ac7))

## [0.7.8](https://github.com/omilli/hellajs/compare/v0.7.7...v0.7.8) (2025-05-29)


### Bug Fixes

* **router:** improve async handling and cleanup ([e337784](https://github.com/omilli/hellajs/commit/e337784e8d16bd314d3743932be5a2fa8ed25543))

## [0.7.7](https://github.com/omilli/hellajs/compare/v0.7.6...v0.7.7) (2025-05-28)


### Bug Fixes

* **router:** add routerOutlet function for dynamic routing ([1313f40](https://github.com/omilli/hellajs/commit/1313f4074443ed5464784c50e4479e6b30b08f9c))
* **router:** remove baseRoute parameter from routerOutlet function ([5a23f78](https://github.com/omilli/hellajs/commit/5a23f782b025d41b56a94d4f3b0f19c9e5755236))

## [0.7.6](https://github.com/omilli/hellajs/compare/v0.7.5...v0.7.6) (2025-05-27)


### Bug Fixes

* **html:** update documentation to clarify factory function descriptions ([9d182d6](https://github.com/omilli/hellajs/commit/9d182d61c6d0cbe75bc4c03cd519f0c04714d078))
* **registry:** replace getNodeRegistry with nodeRegistry and simplify event handling ([600f066](https://github.com/omilli/hellajs/commit/600f066e9fe37fe6aeb7e002d51957a3149ead85))
* **signal:** add value parameter to Signal interface ([0a09eec](https://github.com/omilli/hellajs/commit/0a09eec9f46a48bc705243d0956890547d397fc2))
* **tsconfig:** update output directory structure and clean up build process ([cf29d5d](https://github.com/omilli/hellajs/commit/cf29d5de304575fe978f61107ec305012cd7ebec))

## [0.7.5](https://github.com/omilli/hellajs/compare/v0.7.4...v0.7.5) (2025-05-23)


### Bug Fixes

* **signal:** cleanup Signal type ([5629d39](https://github.com/omilli/hellajs/commit/5629d390eb6388e5bfd09cb6d1fe1df7a2ad9279))
* **signal:** use Object.is for comparing signalFn values ([10e08f9](https://github.com/omilli/hellajs/commit/10e08f9e628610ca2b2485a9c303df9cba58250c))

## [0.7.4](https://github.com/omilli/hellajs/compare/v0.7.3...v0.7.4) (2025-05-21)


### Bug Fixes

* **bundle:** optimize bundle dist output ([7ba1efc](https://github.com/omilli/hellajs/commit/7ba1efc42730bff4329e5c6f250859941e4740ab))
* **router:** ensure proper mounting of the component with a newline ([0e4d7b4](https://github.com/omilli/hellajs/commit/0e4d7b4879dcf3890346c821cb500703d0517e11))

## [0.7.3](https://github.com/omilli/hellajs/compare/v0.7.2...v0.7.3) (2025-05-20)


### Bug Fixes

* **registry:** debounce registry cleanup ([5fedb63](https://github.com/omilli/hellajs/commit/5fedb63811dcf97f89b5197434f73d55bbaa400b))
* **store:** enhance store functionality with readonly options and computed properties ([4cfd5f5](https://github.com/omilli/hellajs/commit/4cfd5f519d935b05efc71dbad0f67210c3a5152f))
* **store:** proper cleanup and remove ckeanup popScope ([d54be95](https://github.com/omilli/hellajs/commit/d54be957bc4ee74958d273dc6c0f92f457cfc26c))

## [0.7.2](https://github.com/omilli/hellajs/compare/v0.7.1...v0.7.2) (2025-05-20)


### Bug Fixes

* **resource:** add overloads for resource function to support string URLs ([fcd1c78](https://github.com/omilli/hellajs/commit/fcd1c78ad5f5727cca0c9810ba1a9846e5206a81))
* **show:** allow arrayless default arg for switch and fix type issues ([0a2f143](https://github.com/omilli/hellajs/commit/0a2f14309b766e73c43fb0f84b3f9713d7a5aa9f))

## [0.7.1](https://github.com/omilli/hellajs/compare/v0.7.0...v0.7.1) (2025-05-20)


### Bug Fixes

* update signal function to improve value handling and subscriber management ([a43116f](https://github.com/omilli/hellajs/commit/a43116f83994badb281ebe601176e5daf75ced76))

## [0.7.0](https://github.com/omilli/hellajs/compare/v0.6.3...v0.7.0) (2025-05-19)


### Features

* router & resource ([92d4952](https://github.com/omilli/hellajs/commit/92d49528c3e50d0af8c3576a45fe21c873299f56))


### Bug Fixes

* window in browser only ([71f344d](https://github.com/omilli/hellajs/commit/71f344d76208506351886faeb6b0904a62b85a34))

## [0.6.3](https://github.com/omilli/hellajs/compare/v0.6.2...v0.6.3) (2025-05-15)


### Bug Fixes

* add context to export and readme ([95286cf](https://github.com/omilli/hellajs/commit/95286cfc42510e11776aef9f031177d25d8dff0c))
* organise types, imports, tests ([d965cee](https://github.com/omilli/hellajs/commit/d965cee261c958239496dc56bf26e8e83c56473f))
* update context types and improve test cases ([f4e834c](https://github.com/omilli/hellajs/commit/f4e834c7ed971ecba10f4ad5f2800882f15cc10d))

## [0.6.2](https://github.com/omilli/hellajs/compare/v0.6.1...v0.6.2) (2025-05-15)


### Bug Fixes

* export computed ([f0cb311](https://github.com/omilli/hellajs/commit/f0cb311f3e810a09725e0b24108f1a569fd3b754))

## [0.6.1](https://github.com/omilli/hellajs/compare/v0.6.0...v0.6.1) (2025-05-12)


### Bug Fixes

* let show accept multiple args ([1499ea8](https://github.com/omilli/hellajs/commit/1499ea86a30325287a649de9f0d6a44622a0e71c))
* mount rootSelector ([ebb031f](https://github.com/omilli/hellajs/commit/ebb031f1c0dee343d0f5801ba56b73262b6a83f7))

## [0.6.0](https://github.com/omilli/hellajs/compare/v0.5.0...v0.6.0) (2025-05-09)


### Features

* 0.6.0 rebuild ([442a311](https://github.com/omilli/hellajs/commit/442a311cca591bb301c9fe2e200c0063610eaf1c))


### Bug Fixes

* 0.6.1 index ([9b11db1](https://github.com/omilli/hellajs/commit/9b11db1b5f09e9293eca8c35d4ba89e354124353))

## [0.5.0](https://github.com/omilli/hellajs/compare/v0.4.4...v0.5.0) (2025-05-06)


### Features

* add scoped component and rename For to list ([c1092a8](https://github.com/omilli/hellajs/commit/c1092a856c1fb23841b945905d9c16ac8be9e2ef))

## [0.4.4](https://github.com/omilli/hellajs/compare/v0.4.3...v0.4.4) (2025-05-06)


### Bug Fixes

* add scope to render ([4969879](https://github.com/omilli/hellajs/commit/4969879cf8123c9f0cb9a2bc792de90a3ba669a9))
* remove Component ([2321938](https://github.com/omilli/hellajs/commit/2321938f2923ae76b05652f4fbe7d8cfde4dfdae))

## [0.4.3](https://github.com/omilli/hellajs/compare/v0.4.2...v0.4.3) (2025-05-06)


### Bug Fixes

* add missing export for VNode type ([07ae002](https://github.com/omilli/hellajs/commit/07ae002895f02e05feeffcdd5b2e00ea16140540))

## [0.4.2](https://github.com/omilli/hellajs/compare/v0.4.1...v0.4.2) (2025-05-06)


### Bug Fixes

* add Context interface to define component context structure ([afb7431](https://github.com/omilli/hellajs/commit/afb74312d5fef06f23798193d5766dae923dc292))
* refactor createElement to use setAttribute for attribute handling and fix bool attrs ([6519d38](https://github.com/omilli/hellajs/commit/6519d3839fa5e63676108b503a93fbf1329a5ddc))
* remove context and provider components ([a3f80fc](https://github.com/omilli/hellajs/commit/a3f80fc7f88134b734153a89398d92e1926cbfb0))
* remove obsolete context and provider tests ([4b086e8](https://github.com/omilli/hellajs/commit/4b086e85499c5d2e67dbc0b1bed5c10b59f4d361))
* update ComponentBase type to accept props ([a2a66f8](https://github.com/omilli/hellajs/commit/a2a66f8b5f3204c0e76b47c01f916c76515658d0))

## [0.4.1](https://github.com/omilli/hellajs/compare/v0.4.0...v0.4.1) (2025-05-05)


### Bug Fixes

* **package:** remove private flag from package.json ([9773aba](https://github.com/omilli/hellajs/commit/9773aba04061dd4a1630f536675e35b71ed0221c))

## [0.4.0](https://github.com/omilli/hellajs/compare/v0.3.6...v0.4.0) (2025-05-05)


### Features

* merge 0.4.0 ([1dcee18](https://github.com/omilli/hellajs/commit/1dcee18aa535661187a86927eee3d5bcf00fc45c))


### Bug Fixes

* **element:** optimize child node rendering with fragments ([4573555](https://github.com/omilli/hellajs/commit/4573555d7c8bf90f5907cd173dfd17867c5b7a1a))
* **tsconfig:** add exclude pattern for test files ([ff8ffce](https://github.com/omilli/hellajs/commit/ff8ffce15e1a66e9af47de056b7032da0eea81aa))
* **tsconfig:** update module detection and clean up compiler options ([0b5ba46](https://github.com/omilli/hellajs/commit/0b5ba4609ef0cb702525002ea56c9d054773327b))
* **types:** update ContextElement to use ComponentContext instead of ContextStore ([074a710](https://github.com/omilli/hellajs/commit/074a7101a73bf263a9439adcbf6cb072c912fb0d))


### Performance Improvements

* **diff:** minor improvements and cleanup ([5c656fc](https://github.com/omilli/hellajs/commit/5c656fc0ae70fb8c11407384baff2a13f2a34204))
