import { store } from "@hellajs/store";
import { resource } from "@hellajs/resource";

export interface Post {
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
  posts: Post[];
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

export const appStore = store({
  searchValue: "",
  page: 1,
  postId: "",
  userId: "",
});

const BASE = "https://dummyjson.com";

export const postsResource = resource<PostsResponse, string>(
  (urlPath) => fetch(`${BASE}/${urlPath}`).then(r => r.json()),
  {
    key: () => {
      const search = appStore.searchValue();
      const skip = (appStore.page() - 1) * 10;
      const base = search ? "posts/search" : "posts";
      const params = new URLSearchParams({ limit: "10", skip: String(skip) });
      if (search) params.set("q", search);
      return `${base}?${params}`;
    },
    staleTime: 30000,
    cacheTime: 300000,
  }
);

export const postResource = resource<Post, string>(
  (id) => fetch(`${BASE}/posts/${id}`).then(r => r.json()),
  { key: () => appStore.postId() }
);

export const userResource = resource<User, string>(
  (id) => fetch(`${BASE}/users/${id}`).then(r => r.json()),
  { key: () => appStore.userId() }
);

export const userPostsResource = resource<PostsResponse, string>(
  (id) => fetch(`${BASE}/users/${id}/posts`).then(r => r.json()),
  { key: () => appStore.userId() }
);
