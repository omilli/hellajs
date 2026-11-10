import { style } from "@hellajs/css";
import { ForEach } from "@hellajs/dom";
import { BackLink } from "../components/BackLink";
import { Placeholder } from "../components/Placeholder";
import { Post } from "../components/Post";
import { userResource, userPostsResource } from "../state";
import { theme } from "../theme";

const avatar = style({
  width: "4rem",
  height: "4rem",
  borderRadius: "50%",
  objectFit: "cover",
});

const info = style({
  display: "flex",
  gap: "1rem",
  alignItems: "center",
  marginBottom: "1rem",
});

const meta = style({
  fontSize: "0.85rem",
  color: theme.color.subtle,
  p: {
    margin: "0.15rem 0",
  },
});

const { data: userData, isFetching: isFetchingUser } = userResource;
const { data: postsData, isFetching: isFetchingPosts } = userPostsResource;

export const UserProfile = () => (
  <div>
    <BackLink />

    {() => {
      const user = userData();

      const { firstName, lastName, email, image, company } = user || {};

      if (isFetchingUser()) return <Placeholder message="Loading user..." />;

      if (!user?.id) return <Placeholder message="User not found." />;

      return (
        <div>
          <div class={info}>
            <img class={avatar} src={image} alt={`${firstName} ${lastName}`} />
            <div>
              <h2 class="title" style="margin-bottom: 0.25rem">
                {firstName} {lastName}
              </h2>
              <div class={meta}>
                <p>{email}</p>
                <p>
                  {company?.title} at {company?.name}
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }}

    <h3>Recent Posts</h3>

    {() => {
      const posts = postsData()?.posts ?? [];

      return isFetchingPosts() ? (
        <Placeholder message="Loading posts..." />
      ) : posts.length > 0 ? (
        <ForEach each={posts} use={(post) => <Post data={post} />} />
      ) : (
        <Placeholder message="No posts found." />
      );
    }}
  </div>
);
