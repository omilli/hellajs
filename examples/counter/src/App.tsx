import { signal, effect } from "@hellajs/core";
import { mount } from "@hellajs/dom";

const Counter = () => {
  const count = signal(0);

  const isEven = () => count() % 2 === 0;
  const message = () =>
    count() === 0 ? "Click to start!" :
      isEven() ? `${count()} is even` : `${count()} is odd`;

  // Side effect: update document title
  effect(() => {
    document.title = `Counter: ${count()}`;
  });

  return (
    <div class="p-4 text-center" >
      <h1 class="text-2xl mb-4" > Counter: {count} </h1>
      < p bind:class={() => `mb-4 ${isEven() ? 'text-green-600' : 'text-blue-600'}`}>
        {message}
      </p>

      < div class="flex gap-2 justify-center" >
        <button
          on:click={() => count(count() - 1)}
          class="px-3 py-2 bg-red-500 text-white rounded"
          bind:disabled={() => count() === 0}
        >
          -
        </button>

        < button
          on:click={() => count(count() + 1)}
          class="px-3 py-2 bg-blue-500 text-white rounded"
        >
          +
        </button>

        < button
          on:click={() => count(0)}
          class="px-3 py-2 bg-gray-500 text-white rounded"
          bind:disabled={() => count() === 0}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

mount(Counter, '#app');