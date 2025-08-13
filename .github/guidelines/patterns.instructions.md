---
applyTo: "**/*.{js,mjs,cjs,jsx,ts,tsx}"
---

# Design Patterns Guidelines

Design patterns are reusable solutions to common problems in software design. Use them only when appropriate; do not force their usage.

## Types

- Creational: Object creation (Factory, Builder, Singleton, Prototype)
- Structural: Object composition (Adapter, Bridge, Composite, Decorator, Facade, Flyweight, Proxy)
- Behavioral: Object communication (Chain of Responsibility, Command, Iterator, Mediator, Memento, Observer, Visitor, Strategy, State, Template Method)

## Usage

- Prefer composition over inheritance.
- Use patterns to simplify code, not add unnecessary complexity.
- Document the intent when applying a pattern.
- Avoid global state (Singleton).
- Use object arguments for constructors with many parameters (Builder).
- Flatten nested structures when needed (Composite).
- Wrap objects to extend behavior (Decorator, Proxy).
- Encapsulate algorithms for flexibility (Strategy, State).

## When Not To Use

- Do not use patterns for trivial problems.
- Avoid patterns that introduce unnecessary coupling or complexity.

## Reference

- Patterns should clarify code structure and intent.
- Follow standard JavaScript/TypeScript conventions.