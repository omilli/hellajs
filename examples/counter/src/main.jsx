import { signal, computed, effect } from "@hellajs/core";
import { mount } from "@hellajs/dom";
import { style } from "@hellajs/css";

const container = style({
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
}, { label: 'container' });

const controls = style({
  display: 'flex',
  gap: '0.5rem',
  justifyContent: 'center',
}, { label: 'controls' });

const btnDec = style({ backgroundColor: '#ef4444' }, { label: 'btn-dec' });
const btnInc = style({ backgroundColor: '#3b82f6' }, { label: 'btn-inc' });
const btnReset = style({ backgroundColor: '#6b7280' }, { label: 'btn-reset' });

const Counter = () => {
  const count = signal(0);

  effect(() => {
    document.title = `Counter: ${count}`;
  });

  const doubled = computed(() => count() * 2);

  return (
    <div class={container}>
      <h1>Counter: {count}</h1>
      <p>Doubled: {doubled}</p>

      <div class={controls}>
        <button
          on:click={() => count(count() - 1)}
          class={btnDec}
          disabled={() => count() === 0}
        >
          -
        </button>

        <button
          on:click={() => count(count() + 1)}
          class={btnInc}
        >
          +
        </button>

        <button
          on:click={() => count(0)}
          class={btnReset}
          disabled={() => count() === 0}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

mount(Counter, '#app');
