import { mount } from '@hellajs/dom';
import { accordion } from "../../../packages/ui/lib"


const App = () => {
  const mainCtrl = accordion('first');
  const sidebarCtrl = accordion('second');

  // Example usage of the controller API

  return (
    <div class="container">
      <h1>HellaJS UI - Accordion Example</h1>
      <p>Multiple independent accordions with reactive controllers</p>

      <h2>My Accordion</h2>
      <div data-accordion="first" data-multiple>
        <div data-accordion-item="item-1" data-open>
          <button data-accordion-trigger>
            Section 1
          </button>
          <div data-accordion-content>
            Content for section 1
          </div>
        </div>

        <div data-accordion-item="item-2">
          <button data-accordion-trigger>
            Section 2
          </button>
          <div data-accordion-content>
            Content for section 2
          </div>
        </div>
      </div>

      <h2>Second Accordion</h2>
      <div data-accordion="second" data-always-open>
        <div data-accordion-item="item-3">
          <button data-accordion-trigger>
            Section 3
          </button>
          <div data-accordion-content>
            Content for section 3
          </div>
        </div>

        <div data-accordion-item="item-4" data-open>
          <button data-accordion-trigger>
            Section 4
          </button>
          <div data-accordion-content>
            Content for section 4
          </div>
        </div>
      </div>
    </div >
  );
};

mount(App, '#app');