import { signal } from '@hellajs/core';
import { $ref, html, mount } from '@hellajs/dom';

const count = signal(0);

// Bind the existing server-rendered <span id="count"> into reactivity — no
// re-render, no full hydrate. The server node stays; its text updates in place.
$ref('#count').bind(() => String(count()));

// Mount a reactive island into the empty <div id="slot"> the server left open.
// Targeting #slot (not #app) is critical: `mount` calls `replaceChildren` and
// would wipe the server-rendered shell if pointed at #app.
const Counter = () => html`
  <button on:click=${() => count(count() + 1)}>
    Increment
  </button>
`;

mount(Counter, '#slot');
