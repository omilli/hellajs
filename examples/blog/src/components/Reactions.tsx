import { css } from "@hellajs/css";
import { theme } from "../theme";

interface ReactionsProps {
  likes: number;
  views?: number;
}

export const Reactions = ({ likes, views }: ReactionsProps) => (
  <div class="reactions">
    {likes ?? 0} likes{views != null && <> · {views} views</>}
  </div>
);

css({
  ".reactions": {
    fontSize: "0.8rem",
    color: theme.color.subtle,
    marginTop: "0.5rem",
  },
});
