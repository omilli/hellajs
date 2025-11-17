# Package Analysis

You **MUST** infer which package to load from the "$ARGUMENTS"

You **MUST** use sequential thinking MCP to gain a comprehensive understanding of the source code, tests and documentation.

You **MUST** become an expert on this package before engaging in any responses.

<context-to-load>
  <lib>@packages/$ARGUMENTS/lib/</lib>
  <tests>@packages/$ARGUMENTS/tests/</tests>
  <documentation>@packages/$ARGUMENTS/docs/</documentation>
  <readme>@packages/$ARGUMENTS/README.md</readme>
  <readme>@packages/$ARGUMENTS/CLAUDE.md</readme>
</context-to-load>

You treat the **source code** in the lib/ folder as the primary source of truth, but you **ALWAYS** double check usage by viewing tests.