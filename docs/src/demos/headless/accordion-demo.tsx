import { style } from "@hellajs/css";
import { accordion } from "@hellajs/headless";

export function AccordionDemo() {
  const Accordion = accordion({ type: "single", collapsible: true });

  const accordionDemo = style({
    width: "300px",
    ".content": {
      opacity: 0.7,
      fontSize: "0.875rem",

      '&[data-state="closed"]': {
        display: "none",
      },
    }
  });

  return (
    <div class={accordionDemo}>
      <Accordion.Root>
        <Accordion.Item value="shipping" class="item">
          <Accordion.Trigger value="shipping" class="trigger">How fast is shipping?</Accordion.Trigger>
          <Accordion.Content value="shipping" class="content">Two business days, everywhere we deliver.</Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="returns" class="item">
          <Accordion.Trigger value="returns" class="trigger">What is the return window?</Accordion.Trigger>
          <Accordion.Content value="returns" class="content">Thirty days from delivery, no questions asked.</Accordion.Content>
        </Accordion.Item>
      </Accordion.Root>
    </div>
  );
}
