import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import type { Placement } from "@hellajs/headless";
import { computeAnchorPosition } from "@hellajs/headless/utils";

export function ComputeAnchorPositionDemo() {
  // The doc's Basic Usage geometry: the anchor sits near the top edge and
  // the floating box is too tall to fit above, so a "top" request flips to
  // "bottom".
  const anchor = { top: 100, left: 24, width: 96, height: 32 };
  const floating = { width: 200, height: 120 };
  const viewport = { width: 1024, height: 768 };

  const side = signal<Placement>("top");
  const align = signal<"none" | "start" | "end">("none");

  const requested = (): Placement =>
    `${side()}${align() === "none" ? "" : `-${align()}`}` as Placement;

  const compute = () =>
    computeAnchorPosition(anchor, floating, viewport, {
      placement: requested(),
      offset: 8,
    });

  const computeAnchorPositionDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    "& .row": {
      alignItems: "center",
      display: "flex",
      flexWrap: "wrap",
      gap: "0.375rem",
    },
    "& .row-label": {
      width: "3rem",
    },
    "& .choice[data-active]": {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    "& .report": {
      fontSize: "0.8125rem",
      fontVariantNumeric: "tabular-nums",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={computeAnchorPositionDemo}>
      <div class="row">
        <span class="row-label">Side</span>
        {["top", "bottom", "left", "right"].map((value) => (
          <button
            type="button"
            class="choice"
            data-active={side() === value ? "" : undefined}
            on:click={() => side(value as Placement)}
          >
            {value}
          </button>
        ))}
      </div>
      <div class="row">
        <span class="row-label">Align</span>
        {["none", "start", "end"].map((value) => (
          <button
            type="button"
            class="choice"
            data-active={align() === value ? "" : undefined}
            on:click={() => align(value as "start" | "end")}
          >
            {value}
          </button>
        ))}
      </div>
      <p class="report">
        {() => {
          const result = compute();
          return `placement: ${result.placement}, x: ${result.x}, y: ${result.y}, width: ${result.width}`;
        }}
      </p>
    </div>
  );
}
