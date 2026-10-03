import { signal } from "@hellajs/core";
import { style } from "@hellajs/css";
import Pagination, { PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@registry/pagination/css/pagination.js";
import { muted } from "./demo-kit";

const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
});



const pages = [1, 2, 3, 4, 5];

export default function PaginationDemo() {
  const page = signal(2);
  const go = (p: number) => page(p);

  return (
    <div class={stack}>
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious onclick={() => go(Math.max(1, page() - 1))} /></PaginationItem>
          {pages.map((p) => (
            <PaginationItem>
              <PaginationLink onclick={() => go(p)} isActive={page() === p}>{p}</PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem><PaginationEllipsis /></PaginationItem>
          <PaginationItem><PaginationNext onclick={() => go(Math.min(5, page() + 1))} /></PaginationItem>
        </PaginationContent>
      </Pagination>
      <p class={muted}>{() => `Page ${page()} of 5, driven by the links' onclick - no router.`}</p>
    </div>
  );
}

export function PaginationAnchorDemo() {
  return (
    <div class={stack}>
      <Pagination>
        <PaginationContent>
          <PaginationItem><PaginationPrevious href="?page=1" /></PaginationItem>
          {pages.map((p) => (
            <PaginationItem>
              <PaginationLink href={`?page=${p}`} isActive={p === 2}>{p}</PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem><PaginationEllipsis /></PaginationItem>
          <PaginationItem><PaginationNext href="?page=3" /></PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
