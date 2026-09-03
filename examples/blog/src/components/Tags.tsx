import { ForEach } from "@hellajs/dom";
import { style } from "@hellajs/css";
import { theme } from "../theme.ts";

const tagList = style({
  display: "flex",
  gap: "0.4rem",
  flexWrap: "wrap",
  marginTop: "0.5rem",
}, { label: "tags" });

const tag = style({
  fontSize: "0.75rem",
  padding: "0.15rem 0.5rem",
  borderRadius: theme.radius.pill,
  backgroundColor: theme.color.tag,
  color: theme.color.muted,
}, { label: "tag" });

interface TagsProps {
  tags: string[];
}

export const Tags = ({ tags = [] }: TagsProps) => (
  <div class={tagList}>
    <ForEach each={tags} use={(t: string) => (
      <span class={tag}>{t}</span>
    )} />
  </div>
);
