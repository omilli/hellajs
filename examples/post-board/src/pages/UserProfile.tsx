import { css } from "@hellajs/css";
import { ForEach } from "@hellajs/dom";
import { navigate } from "@hellajs/router";
import { userResource, userPostsResource } from "../state.ts";
import { theme } from "../theme.ts";
import { Placeholder } from "../components/Placeholder.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { BackLink } from "../components/BackLink.tsx";

export const UserProfile = () => {
  userResource.fetch();
  userPostsResource.fetch();

  return (
    <>
      {() => {
        const { data, isLoading } = userResource;
        const postsData = userPostsResource.data;

        if (isLoading()) return <Placeholder message="Loading user..." />;

        if (!data() || data()?.message) return <Placeholder message="User not found." />;

        const { firstName, lastName, email, image, company } = data()!;

        return <div class="user-profile">
          <BackLink />

          <div class="card">
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
          </div>

          <h3>Recent Posts</h3>

          {() => userPostsResource.isLoading() && (
            <div class="placeholder">Loading posts...</div>
          )}

          {() => postsData()?.posts?.length ? (
            <ForEach each={() => postsData()?.posts || []} use={(post) => (
              <PostCard post={post} onClick={() => navigate(`/posts/${post.id}`)} />
            )} />
          ) : (
            !userPostsResource.isLoading() && <div class="placeholder">No posts by this user.</div>
          )}
        </div>
      }}
    </>
  );
};

css({
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
}, { name: "user-profile" });
