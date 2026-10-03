
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@registry/bubble/css/bubble.js";
import { stack } from "./demo-kit";

export default function BubbleDemo() {
  return (
    <div class={stack}>
      <BubbleGroup>
        <Bubble><BubbleContent>Default</BubbleContent></Bubble>
        <Bubble variant="secondary"><BubbleContent>Secondary</BubbleContent></Bubble>
        <Bubble variant="muted"><BubbleContent>Muted</BubbleContent></Bubble>
        <Bubble variant="tinted"><BubbleContent>Tinted</BubbleContent></Bubble>
        <Bubble variant="outline"><BubbleContent>Outline</BubbleContent></Bubble>
        <Bubble variant="ghost"><BubbleContent>Ghost</BubbleContent></Bubble>
        <Bubble variant="destructive"><BubbleContent>Destructive</BubbleContent></Bubble>
      </BubbleGroup>
    </div>
  );
}

export function BubbleReactionsDemo() {
  return (
    <div class={stack}>
      <Bubble variant="muted">
        <BubbleContent>Shipping the demo today.</BubbleContent>
        <BubbleReactions side="bottom" align="end">
          <button>👍 3</button>
          <button>🎉 1</button>
        </BubbleReactions>
      </Bubble>
    </div>
  );
}
