import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { layerDismissal } from "@hellajs/headless/utils";

export function LayerDismissalDemo() {
  const menuOpen = signal(false);
  const subOpen = signal(false);
  const report = signal("No layers open: open the menu, then the submenu");
  let disposeMenu: (() => void) | undefined;
  let disposeSub: (() => void) | undefined;

  const layerDismissalDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .menu-panel": {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      display: "flex",
      flexDirection: "column",
      fontSize: "0.875rem",
      gap: "0.25rem",
      padding: "0.375rem",
      width: "12rem",
    },
    "& .submenu-panel": {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      fontSize: "0.875rem",
      padding: "0.375rem",
    },
    "& .note": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={layerDismissalDemo}>
      <button
        type="button"
        class="trigger"
        on:click={() => {
          menuOpen(true);
          report("Menu layer open: Escape dismisses the top layer only");
        }}
      >
        Open menu
      </button>
      {() =>
        menuOpen() ? (
          <div
            class="menu-panel"
            hook:afterMount={(node) => {
              if (!(node instanceof HTMLElement)) return;
              disposeMenu = layerDismissal(() => [node], () => {
                subOpen(false);
                menuOpen(false);
                report("Escape dismissed the menu layer");
              });
            }}
            hook:beforeDestroy={() => {
              disposeMenu?.();
              disposeMenu = undefined;
            }}
          >
            <div class="item">File</div>
            <button
              type="button"
              class="item item-button"
              on:click={() => {
                subOpen(true);
                report("Submenu layer stacked on top");
              }}
            >
              Open submenu
            </button>
            <div class="item">Edit</div>
          </div>
        ) : null
      }
      {() =>
        menuOpen() && subOpen() ? (
          <div
            class="submenu-panel"
            hook:afterMount={(node) => {
              if (!(node instanceof HTMLElement)) return;
              disposeSub = layerDismissal(() => [node], () => {
                subOpen(false);
                report("Escape dismissed the submenu layer: menu stays");
              });
            }}
            hook:beforeDestroy={() => {
              disposeSub?.();
              disposeSub = undefined;
            }}
          >
            Submenu layer
          </div>
        ) : null
      }
      <p class="note">{() => report()}</p>
    </div>
  );
}
