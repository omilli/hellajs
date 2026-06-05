import { navigate } from "@hellajs/router";
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

      if (isFetching()) return <Placeholder message="Loading post..." />;

      return <div class="post-detail">
        <BackLink />
        {post?.body ?
          <PostCard post={post!} /> :
          <Placeholder message="Post not found." />
        }
      </div>
    }}
  </>
};
