import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Resizable, { ResizableHandle, ResizablePanel } from "@registry/resizable/css/resizable.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  width: "100%",
});

const viewport = style({
  height: "12rem",
  width: "100%",
}, { label: "demo-viewport" });

const panelBody = style({
  alignItems: "center",
  display: "flex",
  height: "100%",
  justifyContent: "center",
  overflow: "hidden",
  padding: "1rem",
}, { label: "demo-panel-body" });



export default function ResizableDemo() {
  const sizes = signal("50 / 50");

  return (
    <div class={stack}>
      <div class={viewport}>
        <Resizable direction="horizontal" onLayout={(next: number[]) => sizes(next.map((n) => Math.round(n)).join(" / "))}>
          <ResizablePanel defaultSize={50} minSize={25}>
            <div class={panelBody}>Sidebar</div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={50}>
            <div class={panelBody}>Editor</div>
          </ResizablePanel>
        </Resizable>
      </div>
      <p class={muted}>{() => `Sizes: ${sizes()}`}</p>
    </div>
  );
}

export function ResizableClampedDemo() {
  return (
    <div class={stack}>
      <div class={viewport}>
        <Resizable direction="horizontal">
          <ResizablePanel defaultSize={50} minSize={25} maxSize={75}>
            <div class={panelBody}>Sidebar</div>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={50}>
            <div class={panelBody}>Editor</div>
          </ResizablePanel>
        </Resizable>
      </div>
    </div>
  );
}
