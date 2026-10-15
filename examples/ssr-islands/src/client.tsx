import { signal } from '@hellajs/core';
import { mount } from '@hellajs/dom';

const count = signal(0);

// Mount a reactive island into the empty <div id="slot"> the server left open.
// `mount` calls `replaceChildren`, so target the empty slot; pointing it at the
// populated shell would wipe the server-rendered HTML.
const Counter = () => (
  <>
    <p>Count: {count}</p>
    <button on:click={() => count(count() + 1)}>
      Increment
    </button>
  </>
);

mount(Counter, '#slot');
