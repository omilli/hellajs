import { css } from "@hellajs/css";
import { navigate } from "@hellajs/router";
import { theme } from "../theme.ts";
import { Tags } from "./Tags.tsx";
import { Reactions } from "./Reactions.tsx";
import type { Post } from "../state.ts";

interface PostCardProps {
  post: Post;
  onClick?: () => void;
}

const openUser = (id: number) => navigate(`/users/${id}`);

export const PostCard = ({ post, onClick }: PostCardProps) => (
  <div class="post-card card" style={onClick ? "cursor: pointer;" : ""}>
    <div on:click={onClick}>
      <h3 class="card-title">{post.title}</h3>
      <p class="card-body">{post.body}</p>
      <Tags tags={post.tags} />
      <Reactions likes={post.reactions?.likes} views={post.views} />
    </div>
    <a class="user-link" on:click={e => { e.stopPropagation(); openUser(post.userId); }}>
      User {post.userId}
    </a>
  </div>
);

css({
  ".user-link": {
    color: theme.color.link,
    display: "inline-block",
    fontSize: "0.9rem",
    marginTop: "0.5rem",
    cursor: "pointer",
    textDecoration: "none",
    ":hover": { textDecoration: "underline" },
  },
}, { name: "post-card" });
