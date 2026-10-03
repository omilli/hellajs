import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import ToggleGroup from "@registry/toggle-group/css/toggle-group.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});



export default function ToggleGroupDemo() {
  const view = signal("week");

  return (
    <div class={stack}>
      <ToggleGroup
        type="single"
        items={[
          { value: "day", label: "Day" },
          { value: "week", label: "Week" },
          { value: "month", label: "Month" },
        ]}
        value={view}
        onValueChange={(next: string) => view(next)}
      />
      <p class={muted}>{() => `View: ${view() || "none"}. Single mode keeps one active value; clicking the active item deselects it and reports an empty string.`}</p>
    </div>
  );
}

export function ToggleGroupMultipleDemo() {
  const formats = signal(["bold"]);

  return (
    <div class={stack}>
      <ToggleGroup
        type="multiple"
        variant="outline"
        items={[
          { value: "bold", label: "B" },
          { value: "italic", label: "I" },
          { value: "underline", label: "U" },
        ]}
        values={formats}
        onValueChange={(next: string[]) => formats(next)}
      />
      <p class={muted}>{() => `Formats: ${formats().join(", ") || "none"}.`}</p>
    </div>
  );
}
