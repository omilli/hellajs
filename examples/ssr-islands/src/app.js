import { html } from '@hellajs/dom';

// Shared template: a static shell with a server-rendered count and an empty
// island slot. Pure data — no DOM. `ssr()` stringifies it to HTML on the server.
export const App = () => html`
  <div class="shell">
    <h1>SSR Islands</h1>
    <p>Server-rendered count: <span id="count">0</span></p>
    <div id="slot"></div>
  </div>
`;
