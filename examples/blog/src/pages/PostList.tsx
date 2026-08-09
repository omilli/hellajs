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

const goToPage = (p: number) => navigate("/posts", { query: { page: String(p) } });

export const PostList = () => {
  fetch();

  return <>
    <SearchBar
      value={searchValue}
      onSearch={fetch}
    />

    {() => {
      const posts = data()?.posts ?? [];

      return isFetching() ?
        <Placeholder message="Loading posts..." /> :
        posts.length > 0 ?
          <ForEach each={posts} use={(post) =>
            <PostCard post={post} onClick={() => navigate(`/posts/${post.id}`)} />
          } /> :
          <Placeholder message={`No posts found "${searchValue()}".`} />;
    }}

    {totalPages() > 1 &&
      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
    }
  </>;
};
