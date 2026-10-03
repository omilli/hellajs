import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { MessageScroller, MessageScrollerItem } from "@registry/message-scroller/css/message-scroller.js";
import { Bubble } from "@registry/bubble/css/bubble.js";
import { stack } from "./demo-kit";



const frame = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  height: "16rem",
}, { label: "demo-frame-box" });

const fill = style({
  flex: 1,
  minHeight: 0,
}, { label: "demo-fill" });

const sendButton = style({
  background: "var(--primary)",
  borderRadius: "calc(var(--radius) - 2px)",
  color: "var(--primary-foreground)",
  cursor: "pointer",
  fontSize: "0.8125rem",
  fontWeight: 500,
  padding: "0.375rem 0.875rem",
  width: "fit-content",
}, { label: "demo-send-button" });

export default function MessageScrollerDemo() {
  const messages = signal(["First message", "Second message", "Third message"]);
  let counter = 3;

  const send = () => {
    counter += 1;
    messages([...messages(), counter % 2 === 0 ? `You: message ${counter}` : `Message ${counter}`]);
  };

  return (
    <div class={stack}>
      <div class={frame}>
        <MessageScroller class={fill}>
          {() => messages().map((text) => (
            <MessageScrollerItem>
              <Bubble variant={text.startsWith("You") ? "default" : "outline"}>{text}</Bubble>
            </MessageScrollerItem>
          ))}
        </MessageScroller>
        <button class={sendButton} on:click={send}>Add a message</button>
      </div>
    </div>
  );
}

export function MessageScrollerJumpDemo() {
  const atBottom = signal(false);

  return (
    <div class={stack}>
      <div class={frame}>
        <MessageScroller atBottom={atBottom} class={fill}>
          <MessageScrollerItem><Bubble variant="outline">Older message one</Bubble></MessageScrollerItem>
          <MessageScrollerItem><Bubble variant="outline">Older message two</Bubble></MessageScrollerItem>
          <MessageScrollerItem><Bubble variant="outline">Older message three</Bubble></MessageScrollerItem>
          <MessageScrollerItem><Bubble variant="outline">Older message four</Bubble></MessageScrollerItem>
          <MessageScrollerItem><Bubble variant="outline">Older message five</Bubble></MessageScrollerItem>
          <MessageScrollerItem><Bubble variant="outline">Older message six</Bubble></MessageScrollerItem>
          <MessageScrollerItem><Bubble variant="outline">Older message seven</Bubble></MessageScrollerItem>
          <MessageScrollerItem><Bubble variant="outline">Newest message</Bubble></MessageScrollerItem>
        </MessageScroller>
      </div>
    </div>
  );
}
