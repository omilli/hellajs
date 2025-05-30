import { signal } from "../packages/core";
import { html, mount } from "../packages/dom";

// Runtime element proxies
const { div, button, h1 } = html;

function Counter() {
  // Reactive state
  const count = signal(0);
  const countClass = () => count() % 2 === 0 ? "even" : "odd";
  const countLabel = () => `Count: ${count()}`;

  // State modifier
  const increment = () => count.set(count() + 1);

  // Render DOM Nodes
  return div(
    // Functions make element attributes and text reactive
    h1({ class: countClass },
      countLabel
    ),
    // Events are delegated to the mount element
    button({ onclick: increment },
      "Increment"
    )
  );
}

mount(Counter)