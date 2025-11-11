import { element, mount } from '@hellajs/dom';
import { accordion } from "../../../packages/ui/lib"


const App = () => {
  const mainCtrl = accordion('[data-accordion="first"]');
  const sidebarCtrl = accordion('[data-accordion="second"]');

  mainCtrl.open('item-1');

  return (
    <div class="container">
      <h1>HellaJS UI - Accordion Example</h1>
      <p>Multiple independent accordions with reactive controllers</p>

      <h2>My Accordion</h2>
      <div data-accordion="first" class="accordion">
        <div data-accordion-item="item-1" class="accordion-item" data-open>
          <button data-accordion-trigger class="accordion-trigger">
            Section 1
          </button>
          <div data-accordion-content class="accordion-content">
            <div class="accordion-body">
              Content for section 1
            </div>
          </div>
        </div>

        <div data-accordion-item="item-2" class="accordion-item">
          <button data-accordion-trigger class="accordion-trigger">
            Section 2
          </button>
          <div data-accordion-content class="accordion-content">
            <div class="accordion-body">
              Content for section 2
            </div>
          </div>
        </div>
      </div>

      <h2>Second Accordion</h2>
      <div data-accordion="second" class="accordion">
        <div data-accordion-item="item-3" class="accordion-item">
          <button data-accordion-trigger class="accordion-trigger">
            Section 3
          </button>
          <div data-accordion-content class="accordion-content">
            <div class="accordion-body">
              Content for section 3
            </div>
          </div>
        </div>

        <div data-accordion-item="item-4" class="accordion-item" data-open>
          <button data-accordion-trigger class="accordion-trigger">
            Section 4
          </button>
          <div data-accordion-content class="accordion-content">
            <div class="accordion-body">
              Content for section 4
            </div>
          </div>
        </div>
      </div>
    </div >
  );
};

mount(App, '#app');