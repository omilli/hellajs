import { signal } from "@hellajs/core";
import { html, mount, ForEach, type HellaNode } from "@hellajs/dom";

// Shared component definition - works for both SSR and client
export const Counter = (props?: { initial?: number }) => {
  const count = signal(props?.initial ?? Number(document.getElementById("count")?.textContent) ?? 0);

  return html`
    <div class="counter">
      <h2>Count: <span id="count">${count}</span></h2>
      
      <div class="buttons">
        <button on:click=${() => count(count() - 1)}>-</button>
        <button on:click=${() => count(count() + 1)}>+</button>
      </div>
    </div>
  ` as HellaNode;
};