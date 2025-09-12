<critical-instruction>
  These instructions are <strong>critical</strong> to the success of the project. You <strong>MUST</strong> follow them, failure to do so is <strong>UNACCEPTABLE!</strong>
</critical-instruction>

<critical-instruction>
  <strong>ALWAYS</strong> assume hyphenated words e.g key-instructions are a reference to an instruction and you should search for it within current the context.
</critical-instruction>

<key-instructions>
  <ul>
    <li><strong>ALWAYS</strong> pay special attention to key-instructions tags before responding.</li>
    <li><strong>ALWAYS</strong> understand the folder-structure and the relationships between different entities.</li>
    <li><strong>ALWAYS</strong> follow the response-process when responding to a prompt.</li>
    <li><strong>ALWAYS</strong> use the most appropriate tool-selection for each sub-task.</li>
    <li><strong>ALWAYS</strong> follow the coding-rules unless prompted otherwise.</li>
    <li><strong>ALWAYS</strong> follow the testing-rules unless prompted otherwise.</li>
    <li><strong>ALWAYS</strong> check and execute the correct ci-scripts.</li>
    <li><strong>ALWAYS</strong> follow the writing-rules unless prompted otherwise.</li>
  </ul>
</key-instructions>

<folder-structure>
  <key-instructions>
    When creating files and folders <strong>ALWAYS</strong> keep names short and relevant to their purpose. Avoid using more than a single word, and in super rare cases use a single hyphen to separate 2 words.
  </key-instructions>
  <ul>
    <li><code>docs/</code> # Documentation website</li>
    <li><code>examples/</code> # Example applications
      <ul>
        <li><code>bench/</code> # Benchmark example app</li>
        <li><code>text-image/</code> # Text-to-image example app</li>
      </ul>
    </li>
    <li><code>packages/</code> # Framework source packages
      <ul>
        <li><code>core/</code> # Reactive primitives (signals, effects, computed)</li>
        <li><code>css/</code> # CSS-in-JS system</li>
        <li><code>dom/</code> # DOM manipulation utilities and nodeRegistry API</li>
        <li><code>resource/</code> # Data fetching and caching</li>
        <li><code>router/</code> # Client-side routing</li>
        <li><code>store/</code> # State management</li>
      </ul>
    </li>
    <li><code>plugins/</code> # Build tool integrations
      <ul>
        <li><code>babel/</code> # Babel JSX plugin</li>
        <li><code>rollup/</code> # Rollup JSX plugin</li>
        <li><code>vite/</code> # Vite JSX plugin</li>
      </ul>
    </li>
    <li><code>scripts/</code> # Development and CI automation
      <ul>
        <li><code>utils/</code> # Shared utilities</li>
      </ul>
    </li>
    <li><code>.changeset/</code> # Changeset configuration</li>
    <li><code>.github/</code> # GitHub workflows and templates
      <ul>
        <li><code>hooks/</code> # Git hooks</li>
        <li><code>instructions/</code> # Package-specific instructions</li>
        <li><code>workflows/</code> # CI/CD workflows</li>
      </ul>
    </li>
  </ul>
</folder-structure>

<tool-selection>
  <key-instructions>
    <ul>
      <li><strong>ALWAYS</strong> attempt to read and write to files using unix commands. Only use serena or built in tools if you fail.</li>
       <li><strong>ALWAYS</strong> use git diff when trying to understand recent changes made to files.</li>
      <li><strong>ALWAYS</strong> use Playwright to verify changes when working with example apps or the docs website.</li>
    </ul>
  </key-instructions>

  <ul>
    <li><strong>Serena:</strong> Code retrieval and editing.</li>
    <li><strong>Sequential Thinking:</strong> Reasoning and planning.</li>
    <li><strong>Playwright:</strong> Automated browser control.</li>
  </ul>
</tool-selection>

<ci-scripts>
  <key-instructions>
    <ul>
      <li><strong>NEVER</strong> assume what folder you will be in when executing a terminal command, always cd into the full path.</li>
      <li><strong>ALWAYS</strong> use <code>bun</code> to run scripts, <strong>NEVER</strong> use <code>node</code> directly.</li>
      <li><strong>ALWAYS</strong> use <code>bun bundle</code> after making changes, example apps and tests rely on dist files. <strong>NEVER</strong> run example apps without bundle packages.</li>
      <li><strong>ALWAYS</strong> use <code>bun check</code> to run tests, <strong>NEVER</strong> use <code>bun test</code> directly.</li>
    </ul>
  </key-instructions>

  <ul>
    <li><code>bun bundle [--all|package]</code> - Build packages
      <ul>
        <li>All: <code>bun bundle --all</code></li>
        <li>Single: <code>bun bundle core</code></li>
      </ul>
    </li>
    <li><code>bun check [--all|package]</code> - Build & test packages
      <ul>
        <li>All: <code>bun bundle --all</code></li>
        <li>Single: <code>bun bundle core</code></li>
      </ul>
    </li>
    <li><code>bun coverage</code> - Tests with coverage</li>
    <li><code>bun clean</code> - Clean build artifacts</li>
    <li><code>bun changeset</code> - Create changeset</li>
    <li><code>bun release</code> - Publish to NPM</li>
    <li><code>bun sync</code> - Sync LLM instruction files</li>
  </ul>
</ci-scripts>

<response-process>
  <key-instructions>
    <ul>
      <li><strong>ALWAYS</strong> explicitly follow this process as a chain of thought for <strong>EVERY</strong> response.</li>
      <li><strong>NEVER</strong> start your task without a plan.md and todo.md to ensure split-session consistency.</li>
      <li><strong>ALWAYS</strong> update plan.md and todos at every step to ensure split-session consistency.</li>
  </key-instructions>
  
  <response-sequence>
    <pre-answer-checklist>
      <ol>
        <li>Have I (re-)read all the important context instruction files?</li>
        <li>Have I fully understood the task requirements?</li>
        <li>Do I need to ask for clarification?</li>
        <li>Have I made any assumptions?</li>
        <li>Have I contradicted myself?</li>
        <li>Have I broken this task down into enough detailed sub-tasks?</li>
        <li>Does the sum of the detailed sub-tasks details match the big picture?</li>
        <li>Which tools do I need for each requirement?</li>
        <li>Which tracking-files should I create or update?</li>
        <li>Have I gathered all the important files for context?</li>
        <li>What scripts should I run?</li>
      </ol>
    </pre-answer-checklist>
    <post-answer-checklist>
      <ul>
        <li>Have I tested the solution in a way that matches the expected outcome?</strong></li>
        <li>Have I cleaned up any .tmp files that are no longer required?</li>
        <li>Have I fully documented any changes in package README.md, CLAUDE.md or relevant /docs pages?</li>
      </ul>
    </post-answer-checklist>
  </response-sequence>
</response-process>