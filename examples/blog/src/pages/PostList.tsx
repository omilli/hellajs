import { computed } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import { Pagination } from "../components/Pagination.tsx";
import { Placeholder } from "../components/Placeholder.tsx";
import { Post } from "../components/Post.tsx";
import { SearchBar } from "../components/SearchBar.tsx";
import { appStore, postsResource } from "../state.ts";

const { isFetching, data } = postsResource;
const { searchValue } = appStore;

const posts = computed(() => data()?.posts ?? []);

export const PostList = () => (
  <>
    <SearchBar />

    {isFetching() ? (
      <Placeholder message="Loading posts..." />
    ) : posts().length > 0 ? (
      <ForEach each={posts} use={(post) => <Post data={post} />} />
    ) : (
      <Placeholder message={`No posts found "${searchValue()}".`} />
    )}

    <Pagination />
  </>
);
