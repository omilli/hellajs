import { signal } from "@hellajs/core";
import ToggleGroup from "@registry/toggle-group/css/toggle-group.js";

export function ToggleGroupDemo() {
  const view = signal("week");

  return (
    <>
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
      <p class="demo-muted">{() => `View: ${view() || "none"}. Single mode keeps one active value; clicking the active item deselects it and reports an empty string.`}</p>
    </>
  );
}

export function ToggleGroupMultipleDemo() {
  const formats = signal(["bold"]);

  return (
    <>
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
      <p class="demo-muted">{() => `Formats: ${formats().join(", ") || "none"}.`}</p>
    </>
  );
}
