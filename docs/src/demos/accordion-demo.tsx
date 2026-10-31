import { Accordion } from "@components/ui/accordion";
import { signal, signalArray } from "@hellajs/core";
import { Button } from "@components/ui/button";

export function AccordionDemo() {
  const faq = [
    {
      value: "shipping",
      trigger: "How fast is shipping?",
      content: <p>Two business days, everywhere we deliver.</p>,
    },
    {
      value: "returns",
      trigger: "What is the return window?",
      content: <p>Thirty days from delivery, no questions asked.</p>,
    },
  ];

  return <Accordion type="single" collapsible defaultValue="shipping" items={faq} />;
}

export function AccordionMultipleDemo() {
  const specs = [
    {
      value: "size",
      trigger: "Size",
      content: <p>12 x 8 x 3 centimeters.</p>,
    },
    {
      value: "weight",
      trigger: "Weight",
      content: <p>240 grams with the cable.</p>,
    },
  ];

  return <Accordion type="multiple" items={specs} />;
}

export function AccordionDisabledDemo() {
  const plans = [
    {
      value: "starter",
      trigger: "Starter",
      content: <p>Free for personal projects.</p>,
    },
    {
      value: "enterprise",
      trigger: "Enterprise",
      content: <p>Contact sales to upgrade.</p>,
      disabled: true,
    },
  ];

  return <Accordion type="single" items={plans} />;
}

export function AccordionControlledDemo() {
  const open = signal<string>("shipping");
  const faq = [
    {
      value: "shipping",
      trigger: "How fast is shipping?",
      content: <p>Two business days, everywhere we deliver.</p>,
    },
    {
      value: "billing",
      trigger: "When am I billed?",
      content: <p>Invoices go out on the first of the month.</p>,
    },
  ];

  return <>
    <Accordion
      type="single"
      items={faq}
      value={() => open()}
      onValueChange={(v) => open(typeof v === "string" ? v : "")}
    />
    <p class="demo-muted">{() => `Open value: ${open() || "none"}`}</p>
  </>;
}

export function AccordionReactiveDemo() {
  const items = signalArray([
    {
      value: "row-1",
      trigger: "Row 1",
      content: <p>Row 1 content</p>,
    },
    {
      value: "row-2",
      trigger: "Row 2",
      content: <p>Row 2 content</p>,
    },
  ]);

  const add = () => {
    const next = items.length() + 1;
    items.push({
      value: `row-${next}`,
      trigger: `Row ${next}`,
      content: <p>Row {next} content</p>,
    });
  }

  const remove = () => {
    const last = items.length() -1;
    items.splice(last, 1)
  }

  return <>
    <Accordion type="single" items={items} />
    <div style={{display: "flex", gap: "0.5rem"}}>
      <Button on:click={add}>Add</Button>
      <Button on:click={remove}>Remove</Button>
    </div>
  </>
}
