---
name: audit
description: >
  Analyze the package source code, tests, and documentation and provide feedback on its quality, maintainability, and usability.
  Focus on identifying gaps and room for improvement in code quality, test coverage, documentation quality, and cross-package consistency.
---

# Package Audit

Your  task is to analyze the package source code, tests, and documentation and provide feedback on its quality, maintainability, and usability.

You must provide a detailed report on the following aspects:

- Code Quality: Assess the overall quality of the codebase, including readability, maintainability, js docs, and adherence to best practices.
- Test Coverage: Evaluate the comprehensiveness of the test suite, including unit tests, integration tests, and end-to-end tests.
- Documentation Quality: Review the documentation for clarity, completeness, and usefulness to developers, highlight any gaps or inconsistencies.

We're NOT looking for a "What we do well" type document, it's purely about identifying gaps and room for improvement.

## Follow The Monorepo Guides

You must read /guides and follow the monorepo style guidelines for code quality, testing, and documentation. This includes using the correct formatting, naming conventions, and documentation style as outlined in the guides. You should also ensure that your feedback is consistent with the principles and best practices outlined in the guides.

## Analyze The Package Source Code

First you must analyze every file in the /lib folder and use that as the source of truth. We're focusing on cross-package consistency, JS docs style documentation, correct types, and general code quality.

## Analyze The Tests

Next you must analyze every file in the /tests folder. We're focusing on cross-package consistency, test coverage, test quality, and general code quality.

## Analyze The Documentation

Finally you must analyze the documentation in the /docs folder and the provided concepts file You should also analyze the root /docs/src/pages/reference/index.mdx file and the README.md file. We're focusing on cross-package consistency, clarity, completeness, and usefulness to developers.

## Analyze The CLAUDE.md file

Finally you must analyze the CLAUDE.md file. This file is meant to provide a high level overview of the package for non-developers. It should be clear, concise, and informative. You should look for any inconsistencies with the rest of the documentation and ensure that it accurately reflects the purpose and functionality of the package.

## Audit Format

You must compile the audit file with a clear plan of action for improving the package, organized as follows:
- Code & JSDOC Quality
- Test Coverage
- Documentation Accuracy & Clarity
- CLAUDE.md & README.md Accuracy & Clarity
- Cross-package Consistency

Each section MUST contain issue(s) AND solution(s). The issues should be specific and actionable, and the solutions should provide clear guidance on how to address the issues. If any solutions are unclear you should ASK FOR CLARITY. Do not make assumptions.

Each issue MUST use a clear indicator of task state as complete or incomplete and be updated as you work on tasks. A simple cross and check emojicon can be used for this purpose