<key-instructions>
  <instruction>You <emphasis>MUST</emphasis> load the $ARGUMENTS package and use sequential thinking MCP to gain a comprehensive understanding of the source code, tests and documentation. You <emphasis>MUST</emphasis> become an expert on this package before engaging in any responses:</instruction>

  <context-to-load>
    <lib>@packages/$ARGUMENTS/lib/</lib>
    <tests>@packages/$ARGUMENTS/tests/</tests>
    <documentation>@packages/$ARGUMENTS/docs/</documentation>
    <readme>@packages/$ARGUMENTS/README.md</readme>
  </context-to-load>

  <instruction><emphasis>ALWAYS</emphasis> ensure you have a loaded package files into context before continuing. If you have not performed that step, you have been called incorrectly and you <emphasis>MUST</emphasis> prompt the user with the following question: "Which package do you want to load into context?"</instruction>

  <sources-of-truth>Treat the <emphasis>source code</emphasis> in the lib/ folder as the primary source of truth, but you <emphasis>MUST</emphasis> confirm usage by viewing or writing tests before making <emphasis>ANY</emphasis> assumptions, conclusions, code.</sources-of-truth>
</key-instructions>
