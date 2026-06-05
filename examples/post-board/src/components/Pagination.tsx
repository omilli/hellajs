import { css } from "@hellajs/css";
import type { Signal } from "@hellajs/core";
import { theme } from "../theme.ts";

interface PaginationProps {
  page: Signal<number>;
  totalPages: () => number;
}

export const Pagination = ({ page, totalPages }: PaginationProps) => (
  <div class="pagination">
    <button
      on:click={() => page(Math.max(1, page() - 1))}
      bind:disabled={() => page() <= 1}
    >
      Prev
    </button>
    <span class="page-info">
      Page {page()} of {totalPages()}
    </span>
    <button
      on:click={() => page(Math.min(totalPages(), page() + 1))}
      bind:disabled={() => page() >= totalPages()}
    >
      Next
    </button>
  </div>
);

css({
  ".pagination": {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "0.5rem",
    marginTop: "1rem",
    "button": {
      cursor: "pointer",
    },
  },
  ".page-info": {
    fontSize: "0.85rem",
    color: theme.color.subtle,
    padding: "0 0.5rem",
  },
}, { global: true });
