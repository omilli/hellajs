import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { rovingTabIndex } from "@hellajs/headless/utils";

export function RovingTabIndexDemo() {
  const report = signal("Arrow keys move focus between the tabs");
  let disposeRoving: (() => void) | undefined;

  const rovingTabIndexDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .tablist": {
      display: "flex",
      gap: "0.5rem",
    },
    "& .note": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={rovingTabIndexDemo}>
      <div
        class="tablist"
        role="tablist"
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          node.addEventListener("focusin", (event) => {
            const tab = event.target;
            if (tab instanceof HTMLElement) report(`Focused tab: ${tab.textContent}`);
          });
          disposeRoving = rovingTabIndex(node);
        }}
        hook:beforeDestroy={() => disposeRoving?.()}
      >
        <button role="tab" type="button">One</button>
        <button role="tab" type="button">Two</button>
        <button role="tab" type="button">Three</button>
      </div>
      <p class="note">{() => report()}</p>
    </div>
  );
}
