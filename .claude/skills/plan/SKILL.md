---
name: plan
description: Create a detailed plan for a specific task(s). Break down the task into actionable steps using a specific template.
---

Ask as many questions as needed to gather all the necessary information before creating the plan.

Assess the complexity of the request and determine if it is a simple task or a larger plan.

Output a single task to ./plans/[task-name].md and plans with multiple tasks to ./plans/[plan-name]/[task-name].md

Absolutely do not deviate from the provided template and avoid numbered lists at all costs (in both the file and file names).

Ask yourself: "Do all suggested solutions follow the monorepo style guidelines? Are they consistent with the existing codebase and practices? Do they maintain the integrity and readability of the code?"

For each specific task, follow this template:

## [ ] Task Name (Not Numbered) (brackets indicate task completion status)
[Provide a clear and concise name for the task.]

### Depends On
[If this task depends on the completion of other tasks, list them here. If there are no dependencies, you can omit this section or state "None".]

### Objective
[Describe the main goal or objective of the task. What are you trying to achieve?]

### Tasks

#### [ ] Subtask Name (Not Numbered) (brackets indicate task completion status)
[Be as specific as possible to ensure clarity and ease of execution]

#### Solution 

##### Tests
[follow instructions in the Tests section below]

##### Documentation
[follow instructions in the Documentation section below]

##### Validation
[follow instructions in the Validation section below]

### Tests
[Describe any tests that need to be created or updated as part of this task. Be specific about what needs to be tested and how the tests will be structured.]

### Documentation
[Outline any documentation that needs to be created or updated as part of this task. This could include code comments, README/AGENTS updates, or changes to the style guides.]

### Validation
[Describe how you will validate the completion and success of the task. What criteria will you use to determine if the task has been successfully completed?]
