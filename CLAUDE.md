<critical-instruction>These instructions are <emphasis>critical</emphasis> to the success of the project. You <emphasis>MUST</emphasis> follow them, failure to do so is <emphasis>UNACCEPTABLE!</emphasis>
</critical-instruction>

<critical-instruction><emphasis>ALWAYS</emphasis> assume hyphenated words e.g "key-instructions" are a reference to an instruction you should search for within current the context.</critical-instruction>

<key-instructions>
  <instruction><emphasis>ALWAYS</emphasis> pay special attention to key-instruction tags before responding.</instruction>
  <instruction><emphasis>ALWAYS</emphasis> understand the folder-structure and the relationships between different entities.</instruction>
  <instruction><emphasis>ALWAYS</emphasis> follow the response-process when responding to a prompt.</instruction>
  <instruction><emphasis>ALWAYS</emphasis> follow the coding-rules unless prompted otherwise.</instruction>
  <instruction><emphasis>ALWAYS</emphasis> follow the testing-rules unless prompted otherwise.</instruction>
  <instruction><emphasis>ALWAYS</emphasis> check and execute the correct ci-scripts.</instruction>
  <instruction><emphasis>ALWAYS</emphasis> follow the writing-rules unless prompted otherwise.</instruction>
</key-instructions>

<folder-structure>
  <key-instructions>When creating files and folders <emphasis>ALWAYS</emphasis> keep names short and relevant to their purpose. Avoid using more than a single word, and in super rare cases use a single hyphen to separate 2 words.</key-instructions>

  <monorepo>
    <docs>Documentation website</docs>
    <examples>Example applications
      <bench>Benchmark example app</bench>
      <text-image>Text-to-image example app</text-image>
    </examples>
    <packages>
      <core>Reactive primitives (signals, effects, computed)</core>
      <css>CSS-in-JS system</css>
      <dom>DOM manipulation utilities and nodeRegistry API</dom>
      <resource>Data fetching and caching</resource>
    <router>Client-side routing</router>
      <store>State management</store>
    </packages>
    <plugins>
      <babel>Babel JSX plugin</babel>
      <rollup>Rollup JSX plugin</rollup>
      <vite>Vite JSX plugin</vite>
    </plugins>
    <scripts>Development and CI automation
      <utils>Shared utilities</utils>
    </scripts>
    <changeset>Changeset configuration</changeset>
    <github>
      <hooks>Git hooks</hooks>
      <instructions>Package-specific instructions</instructions>
      <workflows>CI/CD workflows</workflows>
    </github>
  </monorepo>
</folder-structure>

<ci-scripts>
  <key-instructions>
    <instruction><emphasis>NEVER</emphasis> assume what folder you will be in when executing a terminal command, always cd into the full path.</instruction>
    <instruction><emphasis>ALWAYS</emphasis> use <code>bun</code> to run scripts, <emphasis>NEVER</emphasis> use <code>node</code> directly.</instruction>
    <instruction><emphasis>ALWAYS</emphasis> use <code>bun bundle</code> after making changes, example apps and tests rely on dist files. <emphasis>NEVER</emphasis> run example apps without bundle packages.</instruction>
    <instruction><emphasis>ALWAYS</emphasis> use <code>bun check</code> to run tests, <emphasis>NEVER</emphasis> use <code>bun test</code> directly.</instruction>
    </key-instructions>

  <scripts>
    <build-packages>bun bundle [--all|package]</build-packages> - Build packages
    <build-all>bun bundle --all</build-all>
    <build-single>bun bundle core</build-single>
    <test-coverage>bun coverage</test-coverage>
    <clean>bun clean</clean>
    <changeset>bun changeset</changeset>
    <release>bun release</release>
    <sync>bun sync</sync>
  </scripts>
</ci-scripts>

<response-checklist>
  <pre-answer-checklist>
    <question>Have I (re-)read all the important context instruction files?</question>
    <question>Have I fully understood the task requirements?</question>
    <question>Do I need to ask for clarification?</question>
    <question>Have I made any assumptions?</question>
    <question>Have I contradicted myself?</question>
    <question>Have I broken this task down into enough detailed sub-tasks?</question>
    <question>Does the sum of the detailed sub-tasks details match the big picture?</question>
    <question>Which tools do I need for each requirement?</question>
    <question>Which tracking-files should I create or update?</question>
    <question>Have I gathered all the important files for context?</question>
    <question>What scripts should I run?</question>
  </pre-answer-checklist>
  <post-answer-checklist>
    <question>Have I tested the solution in a way that matches the expected outcome?</question>
    <question>Have I cleaned up any .tmp  code files that are no longer required?</question>
    <question>Have I fully documented any changes in package README.md, CLAUDE.md or relevant /docs pages?</question>
  </post-answer-checklist>
</response-checklist>

<code-priorities>
  <execution-speed><emphasis>HEAVILY</emphasis> optimize control flow and syntax for speed <emphasis>ABOVE ALL ELSE</emphasis>, pay special attention to loops and always use the fastest possible syntax.</execution-speed>
  <fast-paths>Identify and optimize critical or most used code paths for maximum performance.</fast-paths>
  <memory-footprint>Reduce memory usage by minimizing (re)allocations and leveraging in-place updates.</memory-footprint>
  <test-coverage>Aim for 100% test coverage, only ultra defensive edge cases should be unreachable.</test-coverage>
</code-priorities>

<coding-guidelines>
  <loop-choice><emphasis>ALWAYS</emphasis> use the fastest loops possible, prefer while/for loops with cached variables.</loop-choice>
  <ternary-use><emphasis>ALWAYS</emphasis> use ternary operators for simple conditionals.</ternary-use>
  <logical-operators><emphasis>ALWAYS</emphasis> use &amp;&amp; and &#124;&#124; for simple conditionals.</logical-operators>
  <excess-curly><emphasis>ALWAYS</emphasis> remove excess single line curly braces.</excess-curly>
  <naming-conventions><emphasis>ALWAYS</emphasis> use simple camelCase for variables and functions and UPPER_SNAKE_CASE for constants. Stick to simple single word names where possible.</naming-conventions>
</coding-guidelines>

<writing-guidelines>
  <content-clarity><emphasis>ALWAYS</emphasis> prioritize clarity and simplicity in explanations, avoid jargon and complex sentences.</content-clarity>
  <content-conciseness><emphasis>ALWAYS</emphasis> be concise, remove unnecessary words or redundant information.</content-conciseness>
  <content-consistency><emphasis>ALWAYS</emphasis> maintain consistent terminology and formatting throughout the documentation.</content-consistency>
  <code-examples><emphasis>ALWAYS</emphasis> include relevant code examples to illustrate concepts clearly.</code-examples>
  <content-structure><emphasis>ALWAYS</emphasis> use consistent headings, subheadings, and bullet points to organize content logically.</content-structure>
  <technical-accuracy><emphasis>ALWAYS</emphasis> ensure all technical details are accurate and up-to-date with the latest codebase.</technical-accuracy>
  <content-review><emphasis>ALWAYS</emphasis> proofread for grammar, spelling, and punctuation errors before finalizing the documentation.</content-review>
  <jsdoc-comments><emphasis>ALWAYS</emphasis> ensure JSDoc comments are clear, accurate, and follow standard conventions. Show only @: params, generics and returns</jsdoc-comments>
</writing-guidelines>
