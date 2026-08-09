import { signal, computed, effect } from "@hellajs/core";
import { mount } from "@hellajs/dom";
import { css } from "@hellajs/css";

css({
  '.container': {
    padding: '1rem',
    textAlign: 'center',
    'h1': {
      fontSize: '1.5rem',
      marginBottom: '1rem',
    },
    'p': {
      marginBottom: '1rem',
    },
    'button': {
      padding: '0.5rem 0.75rem',
      color: 'white',
      borderRadius: '0.25rem',
      border: 'none',
      cursor: 'pointer',
    },
    '.controls': {
      display: 'flex',
      gap: '0.5rem',
      justifyContent: 'center',
    },
    '.btn-dec': { backgroundColor: '#ef4444' },
    '.btn-inc': { backgroundColor: '#3b82f6' },
    '.btn-reset': { backgroundColor: '#6b7280' },
  },
});

const Counter = () => {
  const count = signal(0);

  effect(() => {
    document.title = `Counter: ${count}`;
  });

  const doubled = computed(() => count() * 2);

  return (
    <div class="container">
      <h1>Counter: {count}</h1>
      <p>Doubled: {doubled}</p>

      <div class="controls">
        <button
          on:click={() => count(count() - 1)}
          class="btn-dec"
          bind:disabled={count() === 0}
        >
          -
        </button>

        <button
          on:click={() => count(count() + 1)}
          class="btn-inc"
        >
          +
        </button>

        <button
          on:click={() => count(0)}
          class="btn-reset"
          bind:disabled={count() === 0}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

mount(Counter, '#app');
