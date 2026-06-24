import { css } from "@hellajs/css";
import { ForEach } from "@hellajs/dom";
import { navigate } from "@hellajs/router";
import { userResource, userPostsResource } from "../state.ts";
import { theme } from "../theme.ts";
import { Placeholder } from "../components/Placeholder.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { BackLink } from "../components/BackLink.tsx";

const {
  fetch: fetchUser,
  isFetching: isFetchingUser,
  data: userData
} = userResource;

const {
  fetch: fetchPosts,
  data: postsData,
  isFetching: isFetchingPosts
} = userPostsResource;

export const UserProfile = () => {
  fetchUser();
  fetchPosts();

  return <div class="user-profile">
    <BackLink />

    {() => {
      const user = userData();
      const { firstName, lastName, email, image, company } = user || {};

      if (isFetchingUser()) return <Placeholder message="Loading user..." />;

      if (!user?.id) return <Placeholder message="User not found." />;

      return <div class="card">
        <div class="user-info">
          <img class="avatar" src={image} alt={`${firstName} ${lastName}`} />
          <div>
            <h2 class="title" style="margin-bottom: 0.25rem">
              {firstName} {lastName}
            </h2>
            <div class="user-meta">
              <p>{email}</p>
              <p>{company?.title} at {company?.name}</p>
            </div>
          </div>
        </div>
      </div>;
    }}

    <h3>Recent Posts</h3>

    {() => {
      const posts = postsData()?.posts ?? [];

      return isFetchingPosts() ?
        <Placeholder message="Loading posts..." /> :
        posts.length > 0 ?
          <ForEach each={posts} use={(post) =>
            <PostCard post={post} onClick={() => navigate(`/posts/${post.id}`)} />
          } /> :
          <Placeholder message="No posts found." />;
    }}
  </div>;
};

css({
  ".user-profile": {
    ".avatar": {
      width: "4rem",
      height: "4rem",
      borderRadius: "50%",
      objectFit: "cover",
    },
    ".user-info": {
      display: "flex",
      gap: "1rem",
      alignItems: "center",
      marginBottom: "1rem",
    },
    ".user-meta": {
      fontSize: "0.85rem",
      color: theme.color.subtle,
      "& p": { margin: "0.15rem 0" },
    },
  },
});
