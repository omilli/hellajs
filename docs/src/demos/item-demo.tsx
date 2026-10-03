import { signal } from "@hellajs/core";

import Button from "@registry/button/css/button.js";
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemSeparator, ItemTitle } from "@registry/item/css/item.js";
import { muted, stack } from "./demo-kit";

function row(title: string, copy: string) {
  return (
    <Item>
      <ItemMedia variant="icon">{title[0]}</ItemMedia>
      <ItemContent>
        <ItemTitle>{title}</ItemTitle>
        <ItemDescription>{copy}</ItemDescription>
      </ItemContent>
      <ItemActions><Button size="sm" variant="outline">Run</Button></ItemActions>
    </Item>
  );
}

export default function ItemDemo() {
  return (
    <div class={stack}>
      <ItemGroup>
        {row("Archive", "Move the report to long-term storage.")}
        <ItemSeparator />
        {row("Export", "Download a CSV of every entry.")}
        <ItemSeparator />
        {row("Share", "Invite two teammates to collaborate.")}
      </ItemGroup>
    </div>
  );
}

export function ItemSelectionDemo() {
  const active = signal(0);

  const option = (label: string, i: number) => (
    <Item selected={() => active() === i}>
      <ItemContent><ItemTitle>{label}</ItemTitle></ItemContent>
    </Item>
  );

  return (
    <div class={stack} on:click={(e: Event) => {
      const row = (e.target as Element).closest('[data-slot="item"]');
      if (row) active([...row.parentElement!.children].indexOf(row));
    }}>
      <ItemGroup>
        {["Alpha", "Beta", "Gamma"].map((label, i) => option(label, i))}
      </ItemGroup>
      <p class={muted}>{() => `Selected: ${["Alpha", "Beta", "Gamma"][active()]}`}</p>
    </div>
  );
}
