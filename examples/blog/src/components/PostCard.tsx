import { style } from "@hellajs/css";
import { navigate } from "@hellajs/router";
import { card, cardTitle, cardBody, theme } from "../theme.ts";
import { Tags } from "./Tags.tsx";
import { Reactions } from "./Reactions.tsx";
import type { Post } from "../state.ts";

interface PostCardProps {
  post: Post;
  onClick?: () => void;
}

// Compose onto the shared card class — the returned class string carries both
// ("h-card-… h-post-card-…"), each side keeping its own rule.
const postCard = style(card, {
  "&:hover": {
    boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
  },
}, { label: "post-card" });

const userLink = style({
  color: theme.color.link,
  display: "inline-block",
  fontSize: "0.9rem",
  marginTop: "0.5rem",
  cursor: "pointer",
  textDecoration: "none",
  "&:hover": {
    textDecoration: "underline"
  },
}, { label: "user-link" });

const openUser = (id: number) => navigate(`/users/${id}`);

export const PostCard = ({ post, onClick }: PostCardProps) => (
  <div class={postCard} style={onClick ? "cursor: pointer;" : ""}>
    <div on:click={onClick}>
      <h3 class={cardTitle}>{post.title}</h3>
      <p class={cardBody}>{post.body}</p>
      <Tags tags={post.tags} />
      <Reactions likes={post.reactions?.likes} views={post.views} />
    </div>
    <a class={userLink} on:click={e => { e.stopPropagation(); openUser(post.userId); }}>
      User {post.userId}
    </a>
  </div>
);
