import { postResource } from "../state.ts";
import { Placeholder } from "../components/Placeholder.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { BackLink } from "../components/BackLink.tsx";

const { fetch, isFetching, data } = postResource;

export const PostDetail = () => {
  fetch();

  return <>
    {() => {
      const post = data();

      return <div class="post-detail">
        <BackLink />
        {post?.body ?
          <PostCard post={post!} /> :
          <Placeholder message={isFetching() ? "Loading post..." : "Post not found"} />
        }
      </div>
    }}
  </>
};
