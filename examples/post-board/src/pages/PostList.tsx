import { computed } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import { navigate } from "@hellajs/router";
import { appStore, postsResource } from "../state.ts";
import { Placeholder } from "../components/Placeholder.tsx";
import { PostCard } from "../components/PostCard.tsx";
import { SearchBar } from "../components/SearchBar.tsx";
import { Pagination } from "../components/Pagination.tsx";

const { fetch, isFetching, data } = postsResource;
const { searchValue, page } = appStore;

const totalPages = computed(() => {
  const dataValue = data();
  return dataValue ? Math.ceil(dataValue.total / 10) : 0;
});

const fetchPosts = () => {
  page(1);
  fetch();
};

export const PostList = () => {
  fetchPosts();

  return <>
    {() => {
      const posts = data()?.posts ?? [];

      return <div class="post-list">
        <SearchBar
          value={searchValue}
          onSearch={fetchPosts}
        />

        {() => posts.length < 1 &&
          <Placeholder message={isFetching() ? "Loading posts..." : `No posts found "${searchValue()}".`} />
        }

        <ForEach each={posts} use={(post) =>
          <PostCard post={post} onClick={() => navigate(`/posts/${post.id}`)} />
        } />

        {() => totalPages() > 1 &&
          <Pagination page={page} totalPages={totalPages} />
        }
      </div>
    }}
  </>
};
