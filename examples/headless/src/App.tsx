import { element, mount } from "../../../packages/dom";
import { AccordionModule } from "./components/accordion";
import { PopoverModule } from "./components/popover";

AccordionModule();
PopoverModule({ speed: 0.2, reactive: true });

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
    <div data-accordion="second" data-multiple>
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

    <h1>Popover Examples</h1>
    <div style="display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; padding: 2rem;">
      <div data-popover="p1" data-placement="bottom">
        <button data-popover-trigger>Bottom</button>
        <div data-popover-content>This is a bottom-aligned popover</div>
      </div>

      <div data-popover="p2" data-placement="top">
        <button data-popover-trigger>Top</button>
        <div data-popover-content>This is a top-aligned popover</div>
      </div>

      <div data-popover="p3" data-placement="right">
        <button data-popover-trigger>Right</button>
        <div data-popover-content>This is a right-aligned popover</div>
      </div>

      <div data-popover="p4" data-placement="left">
        <button data-popover-trigger>Left</button>
        <div data-popover-content>This is a left-aligned popover</div>
      </div>
    </div>
  </div>
});