import { signal } from "@hellajs/core";
import Pagination, { PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@registry/pagination/css/pagination.js";

const pages = [1, 2, 3, 4, 5];

export function PaginationDemo() {
  const page = signal(2);
  const go = (p: number) => page(p);

  return (
    <>
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
      <p class="demo-muted">{() => `Page ${page()} of 5, driven by the links' onclick - no router.`}</p>
    </>
  );
}

export function PaginationAnchorDemo() {
  return (
    <>
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
    </>
  );
}
