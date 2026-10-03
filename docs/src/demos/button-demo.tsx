import { signal } from "@hellajs/core";

import Button from "@registry/button/css/button.js";
import { row, stack } from "./demo-kit";

export default function ButtonDemo() {
  const clicks = signal(0);

  return (
    <div class={stack}>
      <Button onclick={() => clicks(clicks() + 1)}>
        {() => `Save changes (${clicks()})`}
      </Button>
      <div class={row}>
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div class={row}>
        <Button size="xs">Extra small</Button>
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Add">+</Button>
      </div>
    </div>
  );
}

export function ButtonInvalidDemo() {
  return <Button ariaInvalid={true}>Retry submit</Button>;
}

export function ButtonOverrideDemo() {
  return <Button variant="outline" size="lg" class="w-full">Deploy to production</Button>;
}
