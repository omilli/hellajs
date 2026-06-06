import { ForEach } from "@hellajs/dom";
import { theme } from "../theme";
import { css } from "@hellajs/css";

interface TagsProps {
  tags: string[];
}

export const Tags = ({ tags = [] }: TagsProps) => (
  <div class="tags">
    <ForEach each={tags} use={(tag: string) => (
      <span class="tag">{tag}</span>
    )} />
  </div>
);

css({
  ".tags": {
    display: "flex",
    gap: "0.4rem",
    flexWrap: "wrap",
    marginTop: "0.5rem",
  },
  ".tag": {
    fontSize: "0.75rem",
    padding: "0.15rem 0.5rem",
    borderRadius: theme.radius.pill,
    backgroundColor: theme.color.tag,
    color: theme.color.muted,
  },
}, { global: true });
