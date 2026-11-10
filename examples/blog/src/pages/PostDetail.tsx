import { BackLink } from "../components/BackLink.tsx";
import { Placeholder } from "../components/Placeholder.tsx";
import { Post } from "../components/Post.tsx";
import { postResource } from "../state.ts";

const { isFetching, data } = postResource;

export const PostDetail = () => (
  <>
    <BackLink />

    {() => {
      const post = data();

      return (
        <div class="post-detail">
          {isFetching() ? (
            <Placeholder message="Loading post..." />
          ) : post?.body ? (
            <Post data={post} />
          ) : (
            <Placeholder message="Post not found" />
          )}
        </div>
      );
    }}
  </>
);
