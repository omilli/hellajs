import { effect } from "@hellajs/core";
import { resource } from "@hellajs/resource";
import { store } from "@hellajs/store";

export interface PostData {
  id: number;
  title: string;
  body: string;
  tags: string[];
  reactions: { likes: number; dislikes: number };
  views: number;
  userId: number;
  message?: string;
}

interface PostsResponse {
  posts: PostData[];
  total: number;
  skip: number;
  limit: number;
}

interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  image: string;
  company: { title: string; name: string; department: string };
  message?: string;
}

export const appStore = store<{
  searchValue: string;
  query: string;
  page: number;
  postId: string | null;
  userId: string | null;
  title: string;
}>({
  searchValue: "",
  query: "",
  page: 1,
  postId: null,
  userId: null,
  title: "",
});

effect(() => (document.title = `Blog - ${appStore.title()}`));

const BASE = "https://dummyjson.com";
const cacheTime = 300000;

export const postsResource = resource<PostsResponse, string>(
  (urlPath) => fetch(`${BASE}/${urlPath}`).then((r) => r.json()),
  {
    key: () => {
      const search = appStore.query();
      const skip = (appStore.page() - 1) * 10;
      const base = search ? "posts/search" : "posts";
      const params = new URLSearchParams({ limit: "10", skip: String(skip) });
      if (search) params.set("q", search);
      return `${base}?${params}`;
    },
    refetchOnKeyChange: true,
    keepPreviousData: false,
    staleTime: 30000,
    cacheTime,
  },
);

export const postResource = resource<PostData, string | null>(
  (id) => fetch(`${BASE}/posts/${id}`).then((r) => r.json()),
  { key: () => appStore.postId(), refetchOnKeyChange: true, cacheTime },
);

export const userResource = resource<User, string | null>(
  (id) => fetch(`${BASE}/users/${id}`).then((r) => r.json()),
  { key: () => appStore.userId(), refetchOnKeyChange: true, cacheTime },
);

export const userPostsResource = resource<PostsResponse, string | null>(
  (id) => fetch(`${BASE}/users/${id}/posts`).then((r) => r.json()),
  { key: () => appStore.userId(), refetchOnKeyChange: true, cacheTime },
);
