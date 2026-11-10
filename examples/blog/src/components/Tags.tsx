import { style } from "@hellajs/css";
import { ForEach } from "@hellajs/dom";
import { theme } from "../theme";

interface TagsProps {
  tags: string[];
}

const list = style({
  display: "flex",
  gap: "0.4rem",
  flexWrap: "wrap",
  marginTop: "0.5rem",
});

const badge = style({
  fontSize: "0.8rem",
  padding: "0.15rem 0.5rem",
  borderRadius: theme.radius.pill,
  backgroundColor: theme.color.tag,
  color: theme.color.muted,
});

export const Tags = ({ tags = [] }: TagsProps) => (
  <div class={list}>
    <ForEach each={tags} use={(tag) => <span class={badge}>{tag}</span>} />
  </div>
);
