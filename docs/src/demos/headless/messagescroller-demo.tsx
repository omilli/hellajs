import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { ForEach } from "@hellajs/dom";
import { messageScroller, ScrollerRows } from "@hellajs/headless";

export function MessageScrollerDemo() {
  const atBottom = signal(true);
  const messages = signal(["Alpha", "Beta", "Gamma", "Delta"]);
  let next = 5;

  const MessageScroller = messageScroller({ atBottom });

  const append = () => {
    messages([...messages(), `Message ${next}`]);
    next += 1;
  };

  const messageScrollerDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    width: "300px",
    "& .viewport": {
      border: "1px solid #3a3a48",
      height: "10rem",
      overflowY: "auto",
      padding: "0.75rem",
    },
    "& .content": {
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
    },
    "& .jump": {
      display: "none",
      marginInline: "auto",

      '&[data-active="true"]': {
        display: "inline-flex",
      },
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={messageScrollerDemo}>
      <MessageScroller.Root>
        <MessageScroller.Viewport class="viewport">
          <MessageScroller.Content class="content">
            <ForEach
              each={messages}
              use={(message) => (
                <ScrollerRows.Item class="item">{message}</ScrollerRows.Item>
              )}
            />
          </MessageScroller.Content>
        </MessageScroller.Viewport>
        <MessageScroller.Button class="jump">Jump to bottom</MessageScroller.Button>
      </MessageScroller.Root>
      <button type="button" on:click={append}>
        Append message
      </button>
      <p class="note">
        {() => (atBottom() ? "At the bottom - appends stick." : "Scrolled up - jump back down.")}
      </p>
    </div>
  );
}
