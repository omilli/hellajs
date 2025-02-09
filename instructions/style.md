## Coding Style

Follow these principles when coding a solution.

## Approach

- Justify every line of code and consider bundle size
- Write code that is easy to understand.
- Apply SOLID principles
- Keep it DRY but KISS
- Prefer functional programming

### Always

- Use short but meaningful variables and function args
- Prefer functions over const arrow functions at the top level
- Use destructuring where function args are more than 2
- Put exports near the top of the file (below imports and global vars).
- Use ternary isntead of single if/else (not when throwing an error)
- Use switch instead of multiple if/else
- Create meaningful variable abstractions for if conditions
- Add comments to all top level functions
- Add comments to parts where the code is difficult to understand by reading alone
- Prefer "is" utils over checking typeof
- Use global Hella for tracking when appropriate
- Use prefix for creator/processor/handler functions e.g signalProxy
- Use postfix for action functions e.g readSignal

### Never

- Add comments where code is already meaningful and obvious
- Prefix functions with verbs like create, handle, process etc
