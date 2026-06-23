<babel-plugin-instructions>
  <overview>
    Babel transform plugin for HellaJS JSX and html`` tagged templates. Performs compile-time transformation of JSX and html`` templates into HellaNode object expressions, with attribute categorization, component detection, and style tag to css() conversion.
  </overview>
  <mental-model>
    <concept>JSX is transformed into HellaNode object expressions</concept>
    <concept>html`` templates are parsed into HellaNode AST with slot substitution</concept>
    <concept>Attributes are separated into props, events (on:), bindings (bind:), and lifecycle (hook:) into distinct objects</concept>
    <concept>Components (uppercase) are detected and wrapped in componentScope() calls for automatic cleanup</concept>
    <concept>Passthrough components (ForEach, Portal) bypass componentScope wrapping (direct function calls)</concept>
    <concept>Style: auto-transforms &lt;style&gt; JSX tags into css() calls</concept>
  </mental-model>
  <architecture>
    <key-components>
      <component name="index.mjs">Plugin entry point, combines JSX and html`` transformers</component>
      <component name="src/transformers/jsx.mjs">JSX element and fragment transformation</component>
      <component name="src/transformers/component.mjs">html`` tagged template transformation</component>
      <component name="src/transformers/style.mjs">&lt;style&gt; tag to css() transformation</component>
      <component name="src/parsers/html.mjs">HTML string parser for tagged templates</component>
      <component name="src/parsers/attributes.mjs">Attribute string parser with prefix detection</component>
      <component name="src/parsers/text.mjs">Text content parser with slot marker substitution</component>
      <component name="src/processors/attributes.mjs">Attribute categorization (props/on/bind/hook)</component>
      <component name="src/processors/children.mjs">Child node filtering and normalization</component>
      <component name="src/processors/values.mjs">Attribute value processing and type conversion</component>
      <component name="src/builders/vnode.mjs">HellaNode object expression builder</component>
      <component name="src/builders/component.mjs">Component call expression builder with componentScope() wrapper</component>
      <component name="src/builders/ast.mjs">Intermediate AST to Babel AST converter</component>
      <component name="src/utils/babel.mjs">Babel AST utility functions</component>
      <component name="src/utils/imports.mjs">Import injection management (css, ForEach, Portal, componentScope)</component>
      <component name="src/utils/traversal.mjs">AST traversal for detecting components and passthrough tags</component>
    </key-components>
    <data-structures>
      <structure name="Intermediate AST">
        <field name="tag">string | '__slot' — Element tag or slot marker</field>
        <field name="props">Record&lt;string, any&gt; — Parsed attributes</field>
        <field name="children">Array&lt;Node | string&gt; — Child nodes</field>
        <field name="__slot?">number — Slot index for expressions</field>
      </structure>
      <structure name="HellaNode Output">
        <field name="tag">string — Element tag name</field>
        <field name="props">{ [key: string]: any } — Static/dynamic props</field>
        <field name="on?">{ [event: string]: handler } — Event handlers (on: prefix)</field>
        <field name="bind?">{ [key: string]: signal } — Dynamic bindings (bind: prefix)</field>
        <field name="hooks?">{ [hook: string]: fn } — Lifecycle hooks (hook: prefix)</field>
        <field name="children?">Array&lt;any&gt; — Child nodes/text</field>
      </structure>
      <structure name="Slot Markers">
        <detail>Tagged template expressions replaced with __SLOT_N__ during parsing</detail>
        <detail>Substituted with actual Babel expressions during AST conversion</detail>
        <detail>Enables single-pass parsing with deferred expression resolution</detail>
      </structure>
    </data-structures>
    <key-algorithms>
      <algorithm name="jsx-transformation">
        <purpose>Transform JSX syntax into HellaNode object expressions or component calls</purpose>
        <tag-detection>
          <step>Uppercase first letter → component (transforms to function call)</step>
          <step>&lt;style&gt; → special transform to css() call</step>
          <step>Fragment &lt;&gt; → HellaNode with tag: '$'</step>
          <step>Lowercase → regular HellaNode</step>
        </tag-detection>
        <attribute-categorization>
          <detail>on:click → on: { click: handler }</detail>
          <detail>bind:class → bind: { class: signal }</detail>
          <detail>hook:mount → hooks: { mount: fn }</detail>
          <detail>Other → props: { attr: value }</detail>
        </attribute-categorization>
        <component-transformation>&lt;Button onClick={handler}&gt;Click&lt;/Button&gt; transforms to componentScope(Button, { onClick: handler, children: ["Click"] })</component-transformation>
        <passthrough-transformation>ForEach and Portal transform to direct function calls without componentScope wrapper</passthrough-transformation>
        <hellanode-transformation>&lt;div class="box" on:click={handler}&gt;Content&lt;/div&gt; transforms to { tag: "div", props: { class: "box" }, on: { click: handler }, children: ["Content"] }</hellanode-transformation>
      </algorithm>
      <algorithm name="html-template-parsing">
        <purpose>Parse html`` tagged templates into HellaNode AST with slot substitution</purpose>
        <tokenization>
          <step>Build HTML string with __SLOT_N__ markers for expressions</step>
          <step>Single regex matches opening/closing tags, attributes, text</step>
          <step>Stack-based parser tracks nesting depth</step>
          <step>Attribute parser extracts key-value pairs with prefix detection</step>
        </tokenization>
        <slot-substitution>
          <step>Parse HTML to intermediate AST with slot markers</step>
          <step>Convert intermediate AST to Babel AST</step>
          <step>Replace __SLOT_N__ nodes with actual expression ASTs</step>
          <step>Handle special cases: &lt;ForEach&gt;, &lt;Portal&gt;, dynamic components &lt;${Comp}&gt;</step>
        </slot-substitution>
        <passthrough-detection>
          <detail>&lt;ForEach&gt; and &lt;Portal&gt; → ensures respective imports from @hellajs/dom</detail>
          <detail>Transformed to direct function calls without componentScope wrapper</detail>
          <detail>Other uppercase tags → wrapped with componentScope() for automatic cleanup</detail>
        </passthrough-detection>
        <component-detection>
          <detail>Uppercase tags and dynamic components → ensures componentScope import from @hellajs/dom</detail>
          <detail>All non-passthrough component calls wrapped with componentScope() for automatic scope management</detail>
        </component-detection>
      </algorithm>
    </key-algorithms>
  </architecture>
  <performance>
    <optimization name="single-pass-tokenization">Combined regex matches all token types in one pass</optimization>
    <optimization name="stack-based-parsing">No recursion overhead</optimization>
    <optimization name="while-loops">Cached lengths in hot paths</optimization>
    <optimization name="direct-property-access">vs iteration</optimization>
    <optimization name="static-child-optimization">Joins string literals</optimization>
    <memory-management>
      <item>Intermediate AST created once, converted to Babel AST</item>
      <item>Slot markers reused (no expression cloning during parse)</item>
      <item>String concatenation via array.join() not +=</item>
      <item>Attribute objects created only when needed (empty checks)</item>
    </memory-management>
    <build-time-benefits>
      <item>No runtime template parsing overhead</item>
      <item>Static analysis enables tree-shaking</item>
      <item>Type safety for component props (TypeScript integration)</item>
      <item>Dead code elimination for unused components</item>
    </build-time-benefits>
  </performance>
  <non-obvious-behaviors>
    <behavior>Uppercase detection — first character uppercase → componentScope() call not HellaNode</behavior>
    <behavior>Passthrough components — ForEach and Portal bypass componentScope wrapping</behavior>
    <behavior>Style tag special case — &lt;style&gt; always transforms to css(), never HellaNode</behavior>
    <behavior>Fragment normalization — &lt;&gt; → HellaNode with tag: '$'</behavior>
    <behavior>Spread attributes — only added to props object, not on/bind/hooks</behavior>
    <behavior>Boolean attributes — no value → true, explicit false → false</behavior>
    <behavior>camelCase conversion — dataFoo, ariaLabel → data-foo, aria-label</behavior>
    <behavior>Kebab-case props — quoted as strings ("data-foo") vs identifiers</behavior>
    <behavior>Children merging — all-string children joined into single string</behavior>
    <behavior>Slot markers visible — __SLOT_N__ appears in intermediate AST, not final output</behavior>
    <behavior>Dynamic components — &lt;${Component}&gt; creates special marker node</behavior>
    <behavior>Whitespace handling — .trim() on text nodes, preserves intentional spaces</behavior>
    <behavior>Self-closing detection — /> with optional space before slash</behavior>
    <behavior>Empty children filtered — removes empty text nodes and null/undefined</behavior>
    <behavior>Attribute prefix precedence (JSX processing order): bind: → hook: → on: → everything else (props)</behavior>
    <behavior>Namespace preservation — xml:lang, xlink:href → "xml:lang" key (quoted string)</behavior>
    <behavior>Component children unwrapping — single child not wrapped in array</behavior>
    <behavior>Mixed content arrays — text + expressions concatenated with + operator</behavior>
    <behavior>Dynamic components in html`` — &lt;${Component}&gt; creates slot marker, resolved to expression</behavior>
    <behavior>Member expressions — &lt;UI.Button&gt; treated as component (JSXMemberExpression)</behavior>
  </non-obvious-behaviors>
</babel-plugin-instructions>
