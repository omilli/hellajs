import { mount } from '@hellajs/dom';
import { accordion, dialog } from "../../../packages/ui/lib"


const App = () => {
  const mainCtrl = accordion('first');
  const sidebarCtrl = accordion('second');
  const simpleDialog = dialog('simple');
  const modalDialog = dialog('modal');

  // Example usage of the controller API

  return (
    <div class="container">
      <h1>HellaJS UI - Components Example</h1>
      <p>Multiple independent components with reactive controllers</p>

      <h2>Dialogs</h2>
      <div style="display: flex; gap: 12px; margin-bottom: 32px;">
        <button data-dialog-trigger="simple">Open Simple Dialog</button>
        <button data-dialog-trigger="modal">Open Modal Dialog</button>
        <button onclick={() => simpleDialog.open()}>Open via API</button>
      </div>

      <div data-dialog="simple">
        <div data-dialog-backdrop></div>
        <div data-dialog-panel>
          <h3>Simple Dialog</h3>
          <p>This dialog can be closed by clicking the backdrop or pressing ESC.</p>
          <button data-dialog-close>Close</button>
        </div>
      </div>

      <div data-dialog="modal" data-modal>
        <div data-dialog-backdrop></div>
        <div data-dialog-panel>
          <h3>Modal Dialog</h3>
          <p>This dialog can only be closed by clicking the close button or pressing ESC.</p>
          <div style="display: flex; gap: 8px; margin-top: 16px;">
            <button data-dialog-close>Close</button>
            <button onclick={() => modalDialog.close()}>Close via API</button>
          </div>
        </div>
      </div>

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