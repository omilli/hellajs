import { signal } from "@hellajs/core";
import { html, mount } from "@hellajs/dom";

const counter = signal(0);

mount(html`
  <button on:click=${() => counter(counter() + 1)}>${counter}</button>
`);
