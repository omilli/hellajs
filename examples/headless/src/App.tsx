import { element, mount } from "../../../packages/dom";
import { AccordionModule, AccordionController } from "./components/accordion";

AccordionModule();

mount(() => {
  return <div onMount={() => {
    console.log(element("[data-accordion='first']").node);
  }}>
    <h1 onDestroy={() => { console.log("Destroyed") }}>Always Open</h1>
    <div data-accordion="first" data-always-open>
      <div data-accordion-item="item-1" data-open>
        <button data-accordion-trigger>
          Toggle Item 1
        </button>
        <div data-accordion-content>
          This is the content of Item 1.
        </div>
      </div>
      <div data-accordion-item="item-2">
        <button data-accordion-trigger>
          Toggle Item 2
        </button>
        <div data-accordion-content>
          This is the content of Item 2.
        </div>
      </div>
    </div>

    <h1>Multiple</h1>
    <div data-accordion="second" multiple>
      <div data-accordion-item="item-A">
        <button data-accordion-trigger>
          Toggle Item A
        </button>
        <div data-accordion-content>
          This is the content of Item A.
        </div>
      </div>
      <div data-accordion-item="item-B">
        <button data-accordion-trigger>
          Toggle Item B
        </button>
        <div data-accordion-content>
          This is the content of Item B.
        </div>
      </div>
    </div>
  </div>
});