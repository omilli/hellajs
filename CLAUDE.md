<important-instructions>
  <key-information>
    <p>You are responsible for the entire development lifecycle of HellaJS, a test-driven, reactive JavaScript framework with comprehensive CI scripts, built using Bun in a monorepo.</p>
    <p>Following these instructions is crucial to the success of the project; failure to do so is unacceptable.</p>
    <ol>
      <li>Pay extra attention to key-instructions</li>
      <li>Use reasoning-strategies to understand the task requirements and possible solutions</li>
      <li>Understand the folder-structure</li>
      <li>Use the correct tool-selection for each task</li>
      <li>Follow the coding-guidelines</li>
      <li>Execute the correct ci-scripts</li>
    </ol>
  </key-information>
  <folder-structure>
    <ul>
      <li><code>docs/</code> # Documentation website (Astro)
        <ul>
          <li><code>src/</code> # Documentation source
            <ul>
              <li><code>components/</code> # Astro components</li>
              <li><code>layouts/</code> # Page layouts</li>
              <li><code>pages/</code> # Content pages
                <ul>
                  <li><code>learn/</code> # Learning materials
                    <ul>
                      <li><code>concepts/</code> # Core concepts</li>
                      <li><code>migrating/</code> # Migration guides</li>
                      <li><code>tutorials/</code> # Step-by-step tutorials</li>
                    </ul>
                  </li>
                  <li><code>plugins/</code> # Plugin documentation</li>
                  <li><code>reference/</code> # API reference
                    <ul>
                      <li><code>core/</code> # Core API docs</li>
                      <li><code>css/</code> # CSS API docs</li>
                      <li><code>dom/</code> # DOM API docs</li>
                      <li><code>resource/</code> # Resource API docs</li>
                      <li><code>router/</code> # Router API docs</li>
                      <li><code>store/</code> # Store API docs</li>
                    </ul>
                  </li>
                </ul>
              </li>
              <li><code>types/</code> # TypeScript definitions</li>
            </ul>
          </li>
        </ul>
      </li>
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
          <li><code>dom/</code> # DOM manipulation utilities</li>
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
      <li><code>tests/</code> # Test suites
        <ul>
          <li><code>core/</code> # Core primitive tests</li>
          <li><code>css/</code> # CSS system tests</li>
          <li><code>dom/</code> # DOM utility tests</li>
          <li><code>resource/</code> # Resource system tests</li>
          <li><code>router/</code> # Router tests</li>
          <li><code>store/</code> # Store tests</li>
          <li><code>utils/</code> # Test utilities</li>
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
    <key-instructions>Use mcp__serena for file operations.</key-instructions>
    <table>
      <tr>
        <th>Task Type</th>
        <th>Primary Tool</th>
        <th>Secondary</th>
        <th>Use When</th>
      </tr>
      <tr>
        <td>Symbol Search</td>
        <td><code>mcp__serena__find_symbol</code></td>
        <td><code>mcp__serena__search_for_pattern</code></td>
        <td>Know symbol name / Need regex patterns</td>
      </tr>
      <tr>
        <td>Code Overview</td>
        <td><code>mcp__serena__get_symbols_overview</code></td>
        <td><code>mcp__serena__list_dir</code></td>
        <td>Understanding file structure / Directory browsing</td>
      </tr>
      <tr>
        <td>Symbol Editing</td>
        <td><code>mcp__serena__replace_symbol_body</code></td>
        <td><code>mcp__serena__insert_after_symbol</code></td>
        <td>Replace entire symbol / Add new symbols</td>
      </tr>
      <tr>
        <td>Reference Analysis</td>
        <td><code>mcp__serena__find_referencing_symbols</code></td>
        <td><code>mcp__serena__search_for_pattern</code></td>
        <td>Track symbol usage / Find call sites</td>
      </tr>
      <tr>
        <td>Research & Docs</td>
        <td><code>WebSearch</code></td>
        <td><code>WebFetch</code></td>
        <td>Current info / Specific URL content</td>
      </tr>
      <tr>
        <td>File Operations</td>
        <td><code>Read</code></td>
        <td><code>MultiEdit</code></td>
        <td>Single file / Batch file edits</td>
      </tr>
      <tr>
        <td>Memory & Context</td>
        <td><code>mcp__serena__read_memory</code></td>
        <td><code>mcp__serena__write_memory</code></td>
        <td>Recall project info / Store insights</td>
      </tr>
    </table>
  </tool-selection>
  <reasoning-strategies>
    <first-principles-thinking>
      <ul>
        <li>Identify goals and/or problems</li>
        <li>Break tasks down to fundamental truths</li>
        <li>Question assumptions and challenge beliefs</li>
        <li>Do not rely on conventional wisdom</li>
        <li>Explore unexpected outcomes</li>
      </ul>
    </first-principles-thinking>
    <decision-making>
      <ul>
        <li>Explicitly state underlying beliefs</li>
        <li>Assess alternative approaches</li>
        <li>Consider contradictions</li>
        <li>Build arguments using strong logic and true premises</li>
        <li>Consider all available information</li>
        <li>Update reasoning when new information becomes available</li>
      </ul>
    </decision-making>
    <drawing-conclusions>
      <ul>
        <li>Never leave a problem partially solved</li>
        <li>Ensure determinations are supported by facts</li>
        <li>Logical validity is valid or invalid; there is no middle ground</li>
      </ul>
    </drawing-conclusions>
  </reasoning-strategies>
  <coding-guidelines>
  <key-instructions><strong>NEVER</strong> pollute the code with inline comments unless the concept is so advanced we need them to understand</key-instructions>
    <kiss>
      <ul>
        <li>Prioritize simplicity and clarity over cleverness in your code solutions.</li>
      </ul>
    </kiss>
    <yagni>
      <ul>
        <li>Implement only the features that are currently required, not those you think you might need.</li>
      </ul>
    </yagni>
    <dry>
      <ul>
        <li>Extract common logic into reusable functions or modules to avoid code duplication.</li>
      </ul>
    </dry>
    <self-documenting-code>
      <ul>
        <li>Write code that clearly expresses its intent through naming and structure, reducing the need for comments.</li>
      </ul>
    </self-documenting-code>
    <avoid-premature-optimization>
      <ul>
        <li>Focus on correctness and clarity first, then optimize only when performance bottlenecks are identified and measured.</li>
      </ul>
    </avoid-premature-optimization>
    <functional-programming>
      <ul>
        <li>Favor pure functions without side effects and immutable data structures when possible.</li>
      </ul>
    </functional-programming>
    <test-driven-development>
      <ul>
        <li>Write tests that define expected behavior or confirm bugs before implementing functionality.</li>
      </ul>
    </test-driven-development>
  </coding-guidelines>
  <ci-scripts>
    <key-instructions>
      ALWAYS use <code>bun</code> to run scripts, NEVER use <code>node</code> directly.
    </key-instructions>
    <key-instructions>
      ALWAYS use <code>bun check</code> to run test, NEVER use <code>bun test</code> directly.
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
      <li><code>bun badges</code> - Generate badges</li>
      <li><code>bun sync</code> - Sync LLM instruction files</li>
    </ul>
  </ci-scripts>
</important-instructions>