import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { anchorPosition } from "@hellajs/headless/utils";

export function AnchorPositionDemo() {
  const open = signal(false);
  const placement = signal("");
  let disposeAnchor: (() => void) | undefined;

  const anchorPositionDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .note": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  // The panel is a fixed overlay positioned by anchorPosition, outside the
  // demo root's flow, so it carries its own style() registration.
  const panel = style({
    backgroundColor: "#1c1c26",
    color: "#e8e8f2",
    fontSize: "0.875rem",
    padding: "0.5rem 0.75rem",
    zIndex: 10,
  });

  return (
    <div class={anchorPositionDemo}>
      <span>
        <button type="button" class="trigger" on:click={() => open(!open())}>
          Options
        </button>
        {() =>
          open() ? (
            <div
              class={panel}
              hook:afterMount={(node) => {
                if (!(node instanceof HTMLElement)) return;
                const anchor = node.previousElementSibling;
                if (!anchor) return;
                disposeAnchor = anchorPosition(anchor, node, {
                  placement: "bottom-start",
                  matchAnchorWidth: true,
                  onUpdate: (finalPlacement) => placement(finalPlacement),
                });
              }}
              hook:beforeDestroy={() => {
                disposeAnchor?.();
                disposeAnchor = undefined;
              }}
            >
              Menu content
            </div>
          ) : null
        }
      </span>
      <p class="note">
        {() =>
          open()
            ? `Pinned ${placement()}, tracks the button on scroll`
            : "Click Options to pin the panel to the button"
        }
      </p>
    </div>
  );
}
