import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";
import ScrollArea, { ScrollBar } from "@registry/scroll-area/css/scroll-area.js";

const pane = style({
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} - 2px)`,
  height: "14rem",
  width: "18rem",
}, { label: "demo-pane" });

const pad = style({
  padding: "0.75rem",
}, { label: "demo-pad" });

const itemRow = style({
  borderBottom: `1px solid color-mix(in oklab, ${tokens.border} 60%, transparent)`,
  fontSize: "0.875rem",
  padding: "0.25rem 0",
}, { label: "demo-item-row" });

const colRow = style({
  alignItems: "center",
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} - 2px)`,
  display: "flex",
  fontSize: "0.875rem",
  height: "10rem",
  justifyContent: "center",
  minWidth: "6rem",
}, { label: "demo-col-row" });

const colStrip = style({
  display: "flex",
  gap: "0.75rem",
  padding: "0.75rem",
  width: "max-content",
}, { label: "demo-col-strip" });

const rows = Array.from({ length: 40 }, (_, i) => <div class={itemRow}>Item {i + 1}</div>);

const cols = Array.from({ length: 12 }, (_, i) => <div class={colRow}>Column {i + 1}</div>);

export function ScrollAreaDemo() {
  return (
    <>
      <ScrollArea class={pane}>
        <div class={pad}>{rows}</div>
      </ScrollArea>
    </>
  );
}

export function ScrollAreaBothAxesDemo() {
  return (
    <>
      <ScrollArea class={pane}>
        <div class={colStrip}>{cols}</div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </>
  );
}
