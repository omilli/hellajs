import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { trapFocus } from "@hellajs/headless/utils";

export function TrapFocusDemo() {
  const report = signal("Tab wraps inside the panel");
  let release: (() => void) | undefined;

  const trapFocusDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .panel": {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      display: "flex",
      flexDirection: "column",
      fontSize: "0.875rem",
      gap: "0.75rem",
      padding: "1rem",
      width: "16rem",
    },
    "& .note": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={trapFocusDemo}>
      <div
        class="panel"
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          node.addEventListener("focusin", (event) => {
            const target = event.target;
            if (target instanceof HTMLInputElement) report("Focus: first input");
            if (target instanceof HTMLButtonElement) report(`Focus: ${target.textContent}`);
          });
          release = trapFocus(node);
        }}
        hook:beforeDestroy={() => release?.()}
      >
        <input placeholder="First focusable" />
        <button type="button">Submit</button>
      </div>
      <p class="note">{() => report()}</p>
    </div>
  );
}
