import { html } from "@hellajs/dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@registry/accordion/css/accordion.js";

export function AccordionDemo() {
  const faq = [{
    value: "shipping",
    trigger: "How fast is shipping?",
    content: <p>Two business days, everywhere we deliver.</p>,
  },
  {
    value: "returns",
    trigger: "What is the return window?",
    content: <p>Thirty days from delivery, no questions asked.</p>
  }];

  // JSX
  return <Accordion type="single" collapsible open="shipping" items={faq} />;

  // html
  return html`<${Accordion} type="single" collapsible open="shipping" items=${faq} />`
}

export function AccordionMultipleDemo() {
  const specs = [{
    value: "size",
    trigger: "Size",
    content: <p>12 x 8 x 3 centimeters.</p>,
  },
  {
    value: "weight",
    trigger: "Weight",
    content: <p>240 grams with the cable.</p>,
  }];

   // JSX
  return <Accordion type="multiple" items={specs} />;

  // html
  return html`<${Accordion} type="multiple" items=${specs} />`
}

export function AccordionDisabledDemo() {
  const plans = [{
    value: "starter",
    trigger: "Starter",
    content: <p>Free for personal projects.</p>,
  },
  {
    value: "enterprise",
    trigger: "Enterprise",
    content: <p>Contact sales to upgrade.</p>,
    disabled: true,
  }];

  // JSX
  return <Accordion type="single" items={plans} />;

  // html
  return html`<${Accordion} type="single" items=${plans} />`
}

export function AccordionManualDemo() {
  const items = [{
    value: "size",
    trigger: "Size",
    content: <p>12 x 8 x 3 centimeters.</p>,
  },
  {
    value: "weight",
    trigger: "Weight",
    content: <p>240 grams with the cable.</p>,
  }];

  return (
  <Accordion type="single">
    {items.map((item) => (
      <AccordionItem key={item.value} value={item.value}>
        <AccordionTrigger>{item.trigger}</AccordionTrigger>
        <AccordionContent>{item.content}</AccordionContent>
      </AccordionItem>
    ))}
  </Accordion>
  )
}
