import { style } from "@hellajs/css";
import { theme } from "../theme.ts";

interface ReactionsProps {
  likes: number;
  views?: number;
}

const reactions = style({
  fontSize: "0.8rem",
  color: theme.color.subtle,
  margin: "0.5rem 0",
});

export const Reactions = ({ likes, views }: ReactionsProps) => (
  <div class={reactions}>
    {likes ?? 0} likes{views != null && ` • ${views} views`}
  </div>
);
