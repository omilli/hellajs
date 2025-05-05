# Changelog

## [0.4.0](https://github.com/omilli/hellajs/compare/v0.3.7...v0.4.0) (2025-05-05)


### Features

* add DataRows component for improved data rendering in Bench component ([93d48b9](https://github.com/omilli/hellajs/commit/93d48b98d1197bda28c9143b80acd29748b021e4))
* add reactive virtual DOM implementation and benchmark components ([59c5884](https://github.com/omilli/hellajs/commit/59c58845c95a9bb4fc193206ed24403d749c652d))
* add README, bunfig, jsconfig, and test files; update package.json with new dependencies ([96223ca](https://github.com/omilli/hellajs/commit/96223ca6a4b71038704a3b6ff7c1df856128d62d))
* enhance component context management by adding signal tracking and cleanup functionality ([a335d4b](https://github.com/omilli/hellajs/commit/a335d4b231ef19dfb14069b3f0cb943f77a1c0db))
* implement component and context APIs; add lifecycle management and context usage in components ([6ac8d6e](https://github.com/omilli/hellajs/commit/6ac8d6eb1154e7ea337667900a4c381d5dfd202f))
* implement Component function and lifecycle hooks for better component management ([14fa544](https://github.com/omilli/hellajs/commit/14fa544dfb5542a8da4cc056cf215441a31b92fa))
* implement context API with createContext, useContext, and Provider components; add example usage in sandbox ([6f40624](https://github.com/omilli/hellajs/commit/6f40624721ef43d0e7bb18b14e440fd443a2cd0f))
* implement ForEach component for dynamic list rendering and update component imports ([b941d81](https://github.com/omilli/hellajs/commit/b941d8159fb356ce6c723484cf195dffc3ffac5e))
* merge 0.4.0 ([5e028b8](https://github.com/omilli/hellajs/commit/5e028b864ecaf2968ff30ff330a1f1a32629a309))
* merge 0.4.0 ([56c644c](https://github.com/omilli/hellajs/commit/56c644c1978530389f9f0a626ed8494ee43ccb5d))


### Bug Fixes

* add null check for node in bindList function; improve renderFor logic with additional checks and tests ([6d02a22](https://github.com/omilli/hellajs/commit/6d02a22b07d020666c3c0b261dca2a1de0639e71))
* improve node swapping logic in renderFor function to handle adjacent nodes correctly ([71e08ea](https://github.com/omilli/hellajs/commit/71e08ea5846a1acf55a4f4851212d8819c39595b))
* update label rendering in Row component to use direct reference ([2fd0285](https://github.com/omilli/hellajs/commit/2fd02850fc0570c7b83213b717ba34dd8bf4fc65))

## [0.3.7](https://github.com/omilli/hellajs/compare/v0.3.6...v0.3.7) (2025-04-23)


### Bug Fixes

* **element:** optimize child node rendering with fragments ([4573555](https://github.com/omilli/hellajs/commit/4573555d7c8bf90f5907cd173dfd17867c5b7a1a))


### Performance Improvements

* **diff:** minor improvements and cleanup ([5c656fc](https://github.com/omilli/hellajs/commit/5c656fc0ae70fb8c11407384baff2a13f2a34204))

## [0.3.6](https://github.com/omilli/hellajs/compare/v0.3.5...v0.3.6) (2025-04-21)


### Bug Fixes

* **attributes, props:** remove handling of 'key' attribute during processing ([1445211](https://github.com/omilli/hellajs/commit/144521147c5dfe7efa0f211962ead6d1a6562034))

## [0.3.5](https://github.com/omilli/hellajs/compare/v0.3.4...v0.3.5) (2025-04-21)


### Bug Fixes

* **bundle:** moving type generation broke d.ts files. Fixed ([d89a596](https://github.com/omilli/hellajs/commit/d89a5967f6c076cbac8fd33050b20117d462b6a5))
* **bundle:** moving type generation broke d.ts files. Fixed ([02e8e35](https://github.com/omilli/hellajs/commit/02e8e355c7777a04b2fb70bd65fc32aa1a8b563d))
* **bundle:** moving type generation broke d.ts files. Fixed ([1f07428](https://github.com/omilli/hellajs/commit/1f074282ddc6c303a9b110a3baeeed5a945e0877))
* **bundle:** push to fix broken release cycle ([58a395b](https://github.com/omilli/hellajs/commit/58a395b6a3d06df6698060b9100d4c902c484208))

## [0.3.4](https://github.com/omilli/hellajs/compare/v0.3.3...v0.3.4) (2025-04-21)


### Bug Fixes

* **diff:** key diffing and performance updates ([f6a8f3c](https://github.com/omilli/hellajs/commit/f6a8f3c4cab3377be75c97d6bda4549ce3065992))

## [0.3.3](https://github.com/omilli/hellajs/compare/v0.3.2...v0.3.3) (2025-04-21)


### Bug Fixes

* **diff:** performance optimisations ([1979a74](https://github.com/omilli/hellajs/commit/1979a74cef1cc2b912d531b5586e48d20d4342fb))

## [0.3.2](https://github.com/omilli/hellajs/compare/v0.3.1...v0.3.2) (2025-04-21)


### Bug Fixes

* **diff:** improve attribute diffing performance ([e617a21](https://github.com/omilli/hellajs/commit/e617a218cb4df735e85aca6ccf42a20f1f0b8a3c))

## [0.3.1](https://github.com/omilli/hellajs/compare/0.3.0...v0.3.1) (2025-04-18)


### Bug Fixes

* **html:** set class prop type to className ([0e88fca](https://github.com/omilli/hellajs/commit/0e88fca7cc2ad982e229fa237dc778fcca39ce6f))

## [0.3.0](https://github.com/omilli/hellajs/compare/0.2.1...v0.3.0) (2025-04-16)

### ⚠ BREAKING CHANGES

* **render:** render removed

### Code Refactoring

* **render:** remove render ([623964d](https://github.com/omilli/hellajs/commit/623964de5ac660c179441b38b7c8f7fa062f25e7))


## [0.2.1](https://github.com/omilli/hellajs/compare/0.2.0...v0.2.1) (2025-04-16)


### Bug Fixes

* **html:** create element attribute/prop types ([f8e549f](https://github.com/omilli/hellajs/commit/f8e549f40a1fe5ed797fec8272f36b714e8cab17))

## [0.2.0](https://github.com/omilli/hellajs/compare/v0.1.3...v0.2.0) (2025-04-16)


### Features

* **mount:** add lifecycle hooks with options arg ([690fff6](https://github.com/omilli/hellajs/commit/690fff600141bf8f47a20a891ea8cc2a50670be0))
