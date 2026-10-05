import { style } from "@hellajs/css";
import Empty, { EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@registry/empty/css/empty.js";

const bareMedia = style({
  color: "var(--muted-foreground)",
}, { label: "demo-bare-media" });

export function EmptyDemo() {
  return (
    <>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>
          </EmptyMedia>
          <EmptyTitle>No results found</EmptyTitle>
          <EmptyDescription>Try a different keyword or clear your filters.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <p>Queries match against file names and contents.</p>
        </EmptyContent>
      </Empty>
    </>
  );
}

export function EmptyPlainMediaDemo() {
  return (
    <>
      <Empty>
        <EmptyHeader>
          <EmptyMedia class={bareMedia}>
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></svg>
          </EmptyMedia>
          <EmptyTitle>No notifications</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>You are all caught up.</EmptyContent>
      </Empty>
    </>
  );
}
