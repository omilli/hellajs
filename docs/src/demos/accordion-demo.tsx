
import Accordion from "@registry/accordion/css/accordion.js";
import { muted, stack } from "./demo-kit";

const faq = [
  { value: "shipping", trigger: "How fast is shipping?", content: [<p class={muted}>Two business days, everywhere we deliver.</p>] },
  { value: "returns", trigger: "What is the return window?", content: [<p class={muted}>Thirty days from delivery, no questions asked.</p>] },
];

const specs = [
  { value: "size", trigger: "Size", content: [<p class={muted}>12 x 8 x 3 centimeters.</p>] },
  { value: "weight", trigger: "Weight", content: [<p class={muted}>240 grams with the cable.</p>] },
];

const plans = [
  { value: "starter", trigger: "Starter", content: [<p class={muted}>Free for personal projects.</p>] },
  { value: "enterprise", trigger: "Enterprise", content: [<p class={muted}>Contact sales to upgrade.</p>], disabled: true },
];

export default function AccordionDemo() {
  return (
    <div class={stack}>
      <Accordion type="single" collapsible open="shipping" items={faq} />
    </div>
  );
}

export function AccordionMultipleDemo() {
  return (
    <div class={stack}>
      <Accordion type="multiple" items={specs} />
    </div>
  );
}

export function AccordionDisabledDemo() {
  return (
    <div class={stack}>
      <Accordion type="single" items={plans} />
    </div>
  );
}
