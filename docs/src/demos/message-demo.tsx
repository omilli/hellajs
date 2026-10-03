import { style } from "@hellajs/css";
import { Message, MessageAvatar, MessageContent, MessageFooter, MessageGroup, MessageHeader } from "@registry/message/css/message.js";
import { Bubble } from "@registry/bubble/css/bubble.js";
import { stack } from "./demo-kit";

const initial = style({
  fontSize: "0.625rem",
}, { label: "demo-initial" });

function row(name: string, initialText: string, time: string, text: string) {
  return (
    <Message>
      <MessageAvatar><span class={initial}>{initialText}</span></MessageAvatar>
      <MessageContent>
        <MessageHeader>{name}</MessageHeader>
        <Bubble variant="outline">{text}</Bubble>
        <MessageFooter>{time}</MessageFooter>
      </MessageContent>
    </Message>
  );
}

export default function MessageDemo() {
  return (
    <div class={stack}>
      <MessageGroup>
        {row("Ada", "Ad", "2 minutes ago", "How does the scroller pin to the bottom?")}
        {row("Grace", "Gr", "A minute ago", "A scroll listener watches the distance to the bottom.")}
      </MessageGroup>
    </div>
  );
}

export function MessageEndDemo() {
  return (
    <div class={stack}>
      <Message align="end">
        <MessageAvatar><span class={initial}>You</span></MessageAvatar>
        <MessageContent>
          <MessageHeader>You</MessageHeader>
          <Bubble>On my way.</Bubble>
          <MessageFooter>Just now</MessageFooter>
        </MessageContent>
      </Message>
    </div>
  );
}
