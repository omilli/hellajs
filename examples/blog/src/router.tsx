import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";
import { Placeholder } from "./components/Placeholder.tsx";
import { PostDetail } from "./pages/PostDetail.tsx";
import { PostList } from "./pages/PostList.tsx";
import { UserProfile } from "./pages/UserProfile.tsx";
import { appStore } from "./state.ts";

export const currentView = signal(<Placeholder message="Loading..." />);

router({
  scrollBehavior: "top",
  routes: {
    "/": "/posts",
    "/posts": (_params, query) => {
      appStore.$update({
        page: query.page ? Number(query.page) : 1,
        postId: null,
        userId: null,
        title: "Posts",
      });
      currentView(PostList());
    },
    "/posts/:id": ({ id }) => {
      appStore.$update({
        postId: id,
        userId: null,
        title: `Post ${id}`,
      });
      currentView(PostDetail());
    },
    "/users/:id": ({ id }) => {
      appStore.$update({
        postId: null,
        userId: id,
        title: `User ${id}`,
      });
      currentView(UserProfile());
    },
  },
  notFound: () => currentView(PostList()),
});
