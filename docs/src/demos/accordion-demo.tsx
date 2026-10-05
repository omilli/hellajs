
import Accordion from "@registry/accordion/css/accordion.js";

const faq = [
  { value: "shipping", trigger: "How fast is shipping?", content: [<p class="demo-muted">Two business days, everywhere we deliver.</p>] },
  { value: "returns", trigger: "What is the return window?", content: [<p class="demo-muted">Thirty days from delivery, no questions asked.</p>] },
];

const specs = [
  { value: "size", trigger: "Size", content: [<p class="demo-muted">12 x 8 x 3 centimeters.</p>] },
  { value: "weight", trigger: "Weight", content: [<p class="demo-muted">240 grams with the cable.</p>] },
];

const plans = [
  { value: "starter", trigger: "Starter", content: [<p class="demo-muted">Free for personal projects.</p>] },
  { value: "enterprise", trigger: "Enterprise", content: [<p class="demo-muted">Contact sales to upgrade.</p>], disabled: true },
];

export function AccordionDemo() {
  return (
    <Accordion type="single" collapsible open="shipping" items={faq} />
  );
}

export function AccordionMultipleDemo() {
  return (
    <Accordion type="multiple" items={specs} />
  );
}

export function AccordionDisabledDemo() {
  return (
    <Accordion type="single" items={plans} />
  );
}
