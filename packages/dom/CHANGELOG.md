# @hellajs/dom

## 1.3.6

### Patch Changes

- [`29098cc`](https://github.com/omilli/hellajs/commit/29098cc8fce9179d92acdd4356f8a6d9c685fe22) Thanks [@actions-user](https://github.com/actions-user)! - optimise node registry

## 1.3.5

### Patch Changes

- fix non-function effect guard

## 1.3.4

### Patch Changes

- [`3c6b4b9`](https://github.com/omilli/hellajs/commit/3c6b4b9153ddef1252937545f0784a939fdfca8e) Thanks [@actions-user](https://github.com/actions-user)! - fix false props

## 1.3.3

### Patch Changes

- [`4383627`](https://github.com/omilli/hellajs/commit/4383627343aac832e523796dcbbaf9ca25c6fab1) Thanks [@actions-user](https://github.com/actions-user)! - fix null/false conditionals printing to dom

## 1.3.2

### Patch Changes

- [`e51d00b`](https://github.com/omilli/hellajs/commit/e51d00bed146c6caf6cd853f94d8c6b66bd2058e) Thanks [@actions-user](https://github.com/actions-user)! - fix non-signal forEach array item updates to dom

## 1.3.1

### Patch Changes

- [`3104f0b`](https://github.com/omilli/hellajs/commit/3104f0b20b8876ec8f0c704133a026286a05898b) Thanks [@actions-user](https://github.com/actions-user)! - fix order of renderprop and ignore children props

## 1.3.0

### Minor Changes

- [`46c0ede`](https://github.com/omilli/hellajs/commit/46c0ede7dae8d32262c50046240482f9e1afce5e) Thanks [@actions-user](https://github.com/actions-user)! - add effects prop to element lifecycle for auto cleanup

### Patch Changes

- [`07da084`](https://github.com/omilli/hellajs/commit/07da08404d8dc23647222f847590606f3c0cf952) Thanks [@actions-user](https://github.com/actions-user)! - fix registry observer not firing on element remove

- [`efc3e59`](https://github.com/omilli/hellajs/commit/efc3e598075102b9d4ed1f0de3f21bc493b3e395) Thanks [@actions-user](https://github.com/actions-user)! - bypass events in renderProps

## 1.2.0

### Minor Changes

- [`99efc9f`](https://github.com/omilli/hellajs/commit/99efc9fbdbc6ebc6730eeffc80011b77859341fe) Thanks [@actions-user](https://github.com/actions-user)! - Add reactive elements(s) functions

## 1.1.3

### Patch Changes

- [`02feffd`](https://github.com/omilli/hellajs/commit/02feffd5eab7bb7a302fd35bbfd6014c1523a03f) Thanks [@actions-user](https://github.com/actions-user)! - prefer direct dom over fragments

## 1.1.2

### Patch Changes

- [`b344442`](https://github.com/omilli/hellajs/commit/b344442f16e0b4a7531aa22eee5b2ce5383400a4) Thanks [@actions-user](https://github.com/actions-user)! - better fragment use for rendering nodes

- [`94b9c1b`](https://github.com/omilli/hellajs/commit/94b9c1bc8d08d0b9bda9c9afaa477464d01e751e) Thanks [@actions-user](https://github.com/actions-user)! - batch forEach with fragment

## 1.1.1

### Patch Changes

- [`57ef409`](https://github.com/omilli/hellajs/commit/57ef409e052db3a96226395167d8adb98ded8d0e) Thanks [@actions-user](https://github.com/actions-user)! - export nodeRegistry methods as standalone functions

## 1.1.0

### Minor Changes

- [`c1189a8`](https://github.com/omilli/hellajs/commit/c1189a83d133530deba0d0879a21a1f7a1ac7f1e) Thanks [@actions-user](https://github.com/actions-user)! - expose nodeRegistry to API

## 1.0.6

### Patch Changes

- [`0fcb0ce`](https://github.com/omilli/hellajs/commit/0fcb0cec3737a2f41cb0f63d1a38393ace429fed) Thanks [@actions-user](https://github.com/actions-user)! - minor optimizations and internal naming changes

## 1.0.5

### Patch Changes

- [`f3c3796`](https://github.com/omilli/hellajs/commit/f3c37963439a58daa0febb102f0a567fa255985c) Thanks [@actions-user](https://github.com/actions-user)! - minor optimizations

## 1.0.4

### Patch Changes

- [`086ef38`](https://github.com/omilli/hellajs/commit/086ef38c808539f8bbe051d77e2ae1b7c45ebb58) Thanks [@actions-user](https://github.com/actions-user)! - cache and loop performance

## 1.0.3

### Patch Changes

- [`89e1871`](https://github.com/omilli/hellajs/commit/89e1871e432349b9ff2edbf82ce24b0a22ebf6ff) Thanks [@actions-user](https://github.com/actions-user)! - loop performance optimisations

## 1.0.2

### Patch Changes

- [`f689117`](https://github.com/omilli/hellajs/commit/f689117a0c059fe4cefa5f5aaab77ad65d7b897f) Thanks [@actions-user](https://github.com/actions-user)! - patch sync

## 1.0.1

### Patch Changes

- [`df6ebaf`](https://github.com/omilli/hellajs/commit/df6ebaf17134ba63af189da1c976e47cb9a587ef) Thanks [@actions-user](https://github.com/actions-user)! - patch bump to sync versions

## 1.0.0

### Minor Changes

- [`f1a7142`](https://github.com/omilli/hellajs/commit/f1a714203be88a7e7e7a3bd8bd6617dd10f35719) Thanks [@actions-user](https://github.com/actions-user)! - Perfromance optimisations

### Patch Changes

- Updated dependencies [[`f1a7142`](https://github.com/omilli/hellajs/commit/f1a714203be88a7e7e7a3bd8bd6617dd10f35719)]:
  - @hellajs/core@0.15.0

## 0.14.17

### Patch Changes

- [`b27e463`](https://github.com/omilli/hellajs/commit/b27e4630da6e993718bc6c6f12d3b83b4fda8985) Thanks [@actions-user](https://github.com/actions-user)! - better element cleanup

## 0.14.16

### Patch Changes

- [`205990c`](https://github.com/omilli/hellajs/commit/205990c47c16ba59f00a761b8343bbf9feff30fd) Thanks [@actions-user](https://github.com/actions-user)! - resolve:prop or prop={resolve(func)(args)} for static values

## 0.14.15

### Patch Changes

- [`8081641`](https://github.com/omilli/hellajs/commit/8081641a406f489a84a5639a73f711b880fc2713) Thanks [@actions-user](https://github.com/actions-user)! - Fix critical forEach bug

## 0.14.14

### Patch Changes

- [`0f40d56`](https://github.com/omilli/hellajs/commit/0f40d5647b086102cad6eac780b10971e388a99c) Thanks [@actions-user](https://github.com/actions-user)! - Allow class arrays without functions

## 0.14.13

### Patch Changes

- [`ea1c561`](https://github.com/omilli/hellajs/commit/ea1c561fe1665ecbd6c8bebcbfb90fab22283960) Thanks [@actions-user](https://github.com/actions-user)! - browser bundles

## 0.14.12

### Patch Changes

- [`1a08251`](https://github.com/omilli/hellajs/commit/1a0825113ed62d8dad3c4743bd1cf85db39ade5d) Thanks [@actions-user](https://github.com/actions-user)! - remove duplicate core imports in bundle

## 0.14.11

### Patch Changes

- [`040824a`](https://github.com/omilli/hellajs/commit/040824a2920648485a70193db80e3df5dd89b96f) Thanks [@actions-user](https://github.com/actions-user)! - Update badge script

## 0.14.10

### Patch Changes

- [`6ed0961`](https://github.com/omilli/hellajs/commit/6ed0961124abe05b839f679e0ca82598b2cbf87c) Thanks [@actions-user](https://github.com/actions-user)! - Update readme

## 0.14.9

### Patch Changes

- [`733d50c`](https://github.com/omilli/hellajs/commit/733d50c8e475c5b4471a23903c2b9022c80b0e38) Thanks [@actions-user](https://github.com/actions-user)! - Doc updates and better JSX support

## 0.14.8

### Patch Changes

- [`6cd0d51`](https://github.com/omilli/hellajs/commit/6cd0d517f27c97b762e7a83145ad4fb15d66778d) Thanks [@actions-user](https://github.com/actions-user)! - Terser bundles and better store package API

## 0.14.7

### Patch Changes

- [`7c3a66b`](https://github.com/omilli/hellajs/commit/7c3a66bd4b3c7ea2c577030be122018253580824) Thanks [@actions-user](https://github.com/actions-user)! - Release for auto changesets

## 0.14.6

### Patch Changes

- [`2d811a5`](https://github.com/omilli/hellajs/commit/2d811a59a99acb5fb90e1885e28c331ef308aab4) Thanks [@omilli](https://github.com/omilli)! - Clean API exports

## 0.14.5

### Patch Changes

- [`e203a7c`](https://github.com/omilli/hellajs/commit/e203a7c1e067a28eb2d97efa151a4b3b7f022dfc) Thanks [@omilli](https://github.com/omilli)! - Minor forEach optimisations

- [`0e64110`](https://github.com/omilli/hellajs/commit/0e6411044a6e7cb2edc1cc930fa4a433899bf348) Thanks [@omilli](https://github.com/omilli)! - Remove slot, add lifecycle to elements.

## 0.14.4

### Patch Changes

- [`5a799c2`](https://github.com/omilli/hellajs/commit/5a799c285203882a622ac672597b5a799fa1628d) Thanks [@omilli](https://github.com/omilli)! - - Remove html function
  - Rebuild Slot for context

## 0.14.3

### Patch Changes

- [`afaefcb`](https://github.com/omilli/hellajs/commit/afaefcb3bd02b1229c7bc9e621c47efb74e21b56) Thanks [@omilli](https://github.com/omilli)! - Fix slot arg parsing
