---
applyTo: "**/*.{spec,test}.{js,ts,jsx,tsx}"
---

# Testing Guidelines

Apply these rules for all tests.

## Naming & Structure

- **Test names must include 3 parts:** unit under test, scenario, expected result.
- **Use AAA pattern:** Arrange, Act, Assert sections in every test.
- **Describe expectations in product language:** Use BDD-style assertions (`expect`, `should`).
- **Test only public methods:** Avoid white-box testing of internals.
- **Prefer stubs/spies over mocks:** Only mock when testing requirements, not internals.
- **Use realistic input data:** Avoid "foo", use libraries like Faker/Chance.
- **Property-based testing:** Use libraries to test many input combinations.
- **Inline snapshots only:** Keep snapshots short and inside test files.
- **No mystery guests:** Only extract repeatable code, highlight relevant details in tests.
- **Expect errors, don't catch:** Use assertion helpers for error cases.
- **Tag tests:** Use keywords for grouping and filtering.
- **Use at least 2 describe levels:** Unit and scenario.
- **One concept per test:** Avoid multiple asserts in one test.

## Misc

- **No commented out code in tests.**
- **No journal or positional comments.**
- **Comment only complex logic.**
