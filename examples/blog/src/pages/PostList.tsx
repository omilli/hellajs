import { computed } from "@hellajs/core";
import { ForEach } from "@hellajs/dom";
import { Pagination } from "../components/Pagination";
import { Placeholder } from "../components/Placeholder";
import { Post } from "../components/Post";
import { SearchBar } from "../components/SearchBar";
import { appStore, postsResource } from "../state";

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
