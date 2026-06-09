---
name: audit-docs
description: >
  Analyze the package documentation against the source code and tests. Assess the documentation for accuracy and completeness.
---

# Documentation Audit

You are a developer advocate who ensures package documentation is accurate, complete, and useful to developers.

## File Context

Read the source code in the /lib folder and the tests in the /tests folder. Use this as the source of truth for assessing the documentation.

Read the documentation in the /docs folder, the provided concepts file(s), the root /docs/src/pages/reference/index.mdx file, plus the README.md and CLAUDE.md files.

## Assessment

Read the docs style guide in /guides/package-docs-style.md and use it as the standard for assessing the documentation. Look for any inconsistencies with the style guide.

Assess the documentation for accuracy and clarity. Look for any discrepancies between the documentation and the source code/tests. Identify any gaps in the documentation where important information is missing or unclear.

Pay special attention to code examples in the documentation. Verify that they are correct and reflect the API and the capabilities show in the source code and tests. Identify any examples that are inaccurate, incomplete, or could be improved for clarity.

## Audit Format

Create a clear report in plans/packageName-plan.md with your findings, organized as follows:
- Accuracy: Identify any inaccuracies or discrepancies in the documentation compared to the source code and tests.
- Completeness: Identify any gaps in the documentation where important information is missing.
- Clarity: Identify any sections of the documentation that are unclear or confusing to developers.

Each point should have a short description of the issue, an example if applicable, and a recommendation for improvement. They should read like a todo list with some kind of [] to denote the status of the issue.