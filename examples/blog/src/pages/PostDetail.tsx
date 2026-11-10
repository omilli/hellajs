import { BackLink } from "../components/BackLink";
import { Placeholder } from "../components/Placeholder";
import { Post } from "../components/Post";
import { postResource } from "../state";

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
