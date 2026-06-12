---
name: plan
description: Create a detailed plan for a specific task(s). Break down the task into actionable steps using a specific template.
---

Ask as many questions as needed to gather all the necessary information before creating the plan.

Assess the complexity of the request and determine if it is a simple task or a larger plan.

Output a single task to ./plans/[task-name].md and plans with multiple tasks to ./plans/[plan-name]/[task-name].md

Absolutely do not deviate from the provided template and avoid numbered lists at all costs (in both the file and file names).

For each specific task, follow this template:

## [x] Task Name (Not Numbered)
[Provide a clear and concise name for the task.]

### Objective
[Describe the main goal or objective of the task. What are you trying to achieve?]

### Tasks (Not Numbered)
  - [x]**Task Name**: [Be as specific as possible to ensure clarity and ease of execution. sub lists are allowed if necessary.]
  - [ ]**Task Name**: [...]
  - [ ]**Task Name**: [...]

### Validation
[Describe how you will validate the completion and success of the task. What criteria will you use to determine if the task has been successfully completed?]

### Tests
[Describe any tests that need to be created or updated as part of this task. Be specific about what needs to be tested and how the tests will be structured.]

### Documentation
[Outline any documentation that needs to be created or updated as part of this task. This could include code comments, README/AGENTS updates, or changes to the style guides.]
