import { style } from "@hellajs/css";
import type { PostData } from "../state";
import { theme } from "../theme";
import { Reactions } from "./Reactions";
import { Tags } from "./Tags";

interface PostProps {
  data: PostData;
}

const post = style({
  cursor: "pointer",
  marginTop: "1rem",
  h3: {
    fontSize: "1.2rem",
    marginBottom: "0",
  },
  p: {
    color: theme.color.muted,
    fontSize: "0.9rem",
  },
  ".user-link": {
    fontSize: "0.8rem",
  },
});

export const Post = ({ data }: PostProps) => {
  const { id, title, body, tags, reactions, views, userId } = data;

  return (
    <div class={post}>
      <div>
        <h3>
          <a href={`/posts/${id}`}>{title}</a>
        </h3>
        <p>{body}</p>
        <Tags tags={tags} />
        <Reactions likes={reactions?.likes} views={views} />
      </div>
      <a class="user-link" href={`/users/${userId}`}>
        User {userId}
      </a>
    </div>
  );
};
