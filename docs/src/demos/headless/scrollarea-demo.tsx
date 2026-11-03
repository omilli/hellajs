import { style } from "@hellajs/css";
import { scrollArea } from "@hellajs/headless";

export function ScrollAreaDemo() {
  const rows = Array.from({ length: 40 }, (_, index) => `Item ${index + 1}`);

  const ScrollArea = scrollArea();

  const scrollAreaDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    '& [data-slot="scroll-area"]': {
      border: "1px solid #3a3a48",
      height: "10rem",
      position: "relative",
      width: "16rem",
    },
    '& [data-slot="scroll-area-viewport"]': {
      height: "100%",
      overflowY: "auto",
      width: "100%",
    },
    '& [data-slot="scroll-area-content"]': {
      padding: "0.5rem",
    },
    '& [data-slot="scroll-area-scrollbar"]': {
      bottom: 0,
      position: "absolute",
      right: 0,
      top: 0,
      touchAction: "none",
      width: "0.625rem",
    },
    '& [data-slot="scroll-area-thumb"]': {
      backgroundColor: "#4a4a5c",
      width: "100%",
    },
    "& .note": {
      fontSize: "0.875rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={scrollAreaDemo}>
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          {rows.map((row) => (
            <div class="row">{row}</div>
          ))}
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>
      <p class="note">Scroll the list or drag the thumb.</p>
    </div>
  );
}
