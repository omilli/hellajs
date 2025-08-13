---
applyTo: "**/*.{ts,tsx}"
---

# TypeScript Guidelines

Apply these guidelines when working with TypeScript.

## Types
- **Prefer interfaces for object types**
  - Bad: `type User = { name: string }`
  - Good: `interface User { name: string }`

- **Use type aliases for primitives/unions**
  - Bad: `interface ID = string | number`
  - Good: `type ID = string | number`

- **Explicit types for public APIs**
  - Bad: `function getUser() {}`
  - Good: `function getUser(): User {}`

- **Avoid `any`**
  - Bad: `let data: any`
  - Good: `let data: unknown`

- **Prefer readonly for immutability**
  - Bad: `user.name = "Bob"`
  - Good: `readonly name: string`

## Functions
- **Type all parameters and returns**
  - Bad: `function add(a, b) {}`
  - Good: `function add(a: number, b: number): number {}`

- **Use arrow functions for expressions**
  - Bad: `function sum(a: number, b: number) {}`
  - Good: `const sum = (a: number, b: number): number => a + b`

## Classes & Objects
- **Type class properties and methods**
  - Bad: `class User { name; }`
  - Good: `class User { name: string; }`

- **Prefer public/private/protected**
  - Bad: `name: string`
  - Good: `private name: string`

## Generics
- **Use generics for reusable code**
  - Bad: `function identity(x: any) {}`
  - Good: `function identity<T>(x: T): T {}`

## Enums & Unions
- **Prefer union types over enums**
  - Bad: `enum Status { Open, Closed }`
  - Good: `type Status = "open" | "closed"`

## Modules
- **Use ES modules**
  - Bad: `require('foo')`
  - Good: `import foo from 'foo'`

- **Export only what’s needed**
  - Bad: `export * from './foo'`
  - Good: `export { foo } from './foo'`

## Formatting
- **Consistent indentation and spacing**
  - Bad: `let x=1`
  - Good: `let x = 1`

- **Single quotes for strings**
  - Bad: `"foo"`
  - Good: `'foo'`

## Comments
- **JSDoc for public APIs**
  - Bad: `// returns user`
  - Good: `/** Returns user */`

- **Comment complex logic only**
  - Bad: `// increment x`
  - Good: `// Handles edge case for x`

## Misc
- **Prefer strict mode**
  - Bad: No `strict` in tsconfig
  - Good: `"strict": true` in tsconfig

- **No unused variables**
  - Bad: `let unused = 1;`
  - Good: Remove unused

- **No implicit any**
  - Bad: `function foo(x) {}`
  - Good: `function foo(x: string) {}`

- **Prefer const over let**
  - Bad: `let x = 1;`
  - Good: `const x = 1;`
