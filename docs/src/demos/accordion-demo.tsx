import { ForEach } from "@hellajs/dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/ui/accordion";
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

  return <Accordion type="single" collapsible open="shipping" items={faq} />;
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

export function AccordionManualDemo() {
  const items = signal([
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
  ]);

  return (
    <Accordion type="single">
      <ForEach
        each={items}
        use={(item: {
          value: string;
          trigger: string;
          content: JSX.Element;
        }) => (
          <AccordionItem key={item.value} value={item.value}>
            <AccordionTrigger>{item.trigger}</AccordionTrigger>
            <AccordionContent>{item.content}</AccordionContent>
          </AccordionItem>
        )}
      />
    </Accordion>
  );
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
    console.log(items())
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
