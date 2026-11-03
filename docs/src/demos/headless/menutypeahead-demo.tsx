import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import { menuTypeahead } from "@hellajs/headless/utils";

export function MenuTypeaheadDemo() {
  const report = signal("Type letters to jump to an item");
  let disposeTypeahead: (() => void) | undefined;

  const menuTypeaheadDemo = style({
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    "& .menu": {
      backgroundColor: "#1c1c26",
      color: "#e8e8f2",
      display: "flex",
      flexDirection: "column",
      fontSize: "0.875rem",
      gap: "0.25rem",
      padding: "0.375rem",
      width: "12rem",
    },
    '& [role="menuitem"]:focus': {
      backgroundColor: "#e8e8f2",
      color: "#18181f",
    },
    "& .note": {
      fontSize: "0.8125rem",
      margin: 0,
      opacity: 0.7,
    },
  });

  return (
    <div class={menuTypeaheadDemo}>
      <div
        role="menu"
        class="menu"
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          disposeTypeahead = menuTypeahead(
            node,
            () =>
              Array.from(node.querySelectorAll<HTMLElement>("[data-menu-item]")).map(
                (item) => ({ node: item, text: item.textContent ?? "" }),
              ),
            (item) => {
              item.node.focus();
              report(`Selected ${item.text}`);
            },
          );
        }}
        hook:beforeDestroy={() => disposeTypeahead?.()}
      >
        <button type="button" role="menuitem" data-menu-item>
          Duplicate
        </button>
        <button type="button" role="menuitem" data-menu-item>
          Rename
        </button>
        <button type="button" role="menuitem" data-menu-item>
          Delete
        </button>
      </div>
      <p class="note">{() => report()}</p>
    </div>
  );
}
