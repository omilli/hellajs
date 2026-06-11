---
name: audit-tests
description: Audit test code against the style guide. Identify areas of improvement and suggest specific changes to enhance test quality, clarity, and maintainability.
---

To audit test code against the style guide, follow these steps:

1. **Review the Style Guide**: Read  ./guides/tests.md to understand the test code standards and best practices that should be followed.

2. **Analyze the Test Code Provided**: Examine the test code for adherence to the style guide and for consistency with the source code. Identify any deviations, inaccuracies, or areas for improvement. Justify your suggestions and don't suggest things for the sake of it.
- Pay special attention to file names and test descriptions, as they should be clear and descriptive of the test's purpose.
- Ensure that test code is well-structured, easy to read, and maintainable.
- Our goal is 100% coverage with minimal amount of tests.
- Avoid where possible testing implementation details and focus on testing the behavior of the code.

3. **Check for Test Coverage**: Run `bun coverage` and assess any missing lines or untested scenarios.

4. **Assess Accuracy of Style Guide**: Decide (very critically) if the style guide is accurate and up-to-date. If you find any inaccuracies or outdated information in the style guide, suggest specific updates to ensure it remains a reliable resource for developers. Justify your suggestions with clear reasoning and examples.