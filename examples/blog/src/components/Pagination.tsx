import { style } from "@hellajs/css";
import type { Signal } from "@hellajs/core";
import { theme } from "../theme.ts";

const pagination = style({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "0.5rem",
  marginTop: "1rem",
  "button": {
    cursor: "pointer",
  },
}, { label: "pagination" });

const pageInfo = style({
  fontSize: "0.85rem",
  color: theme.color.subtle,
  padding: "0 0.5rem",
}, { label: "page-info" });

interface PaginationProps {
  page: Signal<number>;
  totalPages: () => number;
  onPageChange: (page: number) => void;
}

export const Pagination = ({ page, totalPages, onPageChange }: PaginationProps) => (
  <div class={pagination}>
    <button
      on:click={() => onPageChange(Math.max(1, page() - 1))}
      disabled={() => page() <= 1}
    >
      Prev
    </button>
    <span class={pageInfo}>
      Page {page()} of {totalPages()}
    </span>
    <button
      on:click={() => onPageChange(Math.min(totalPages(), page() + 1))}
      disabled={() => page() >= totalPages()}
    >
      Next
    </button>
  </div>
);
