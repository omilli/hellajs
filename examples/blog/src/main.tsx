import { effect, signal } from "@hellajs/core";
import { css } from "@hellajs/css";
import { mount } from "@hellajs/dom";
import { router } from "@hellajs/router";
import { appStore } from "./state.ts";
import "./theme.ts";
import { Placeholder } from "./components/Placeholder.tsx";
import { PostDetail } from "./pages/PostDetail.tsx";
import { UserProfile } from "./pages/UserProfile.tsx";
import { PostList } from "./pages/PostList.tsx";

const title = signal("");
const view = signal(<Placeholder message="Loading..." />);

effect(() => document.title = `Blog - ${title()}`);

router({
  scrollBehavior: 'top',
  routes: {
    "/": "/posts",
    "/posts": (_params, query) => {
      appStore.page(query.page ? Number(query.page) : 1);
      view(PostList());
      title("Posts");
    },
    "/posts/:id": ({ id }) => {
      appStore.postId(id);
      view(PostDetail());
      title(`Post ${id}`);
    },
    "/users/:id": ({ id }) => {
      appStore.userId(id);
      view(UserProfile());
      title(`User ${id}`);
    },
  },
  notFound: () => view(PostList()),
});

const App = <div class="app-container">
  <h1 class="app-title">{title}</h1>
  {view}
</div>

css({
  ".app-container": {
    maxWidth: "48rem",
    margin: "0 auto",
    padding: "1rem",
  },
  ".app-title": {
    fontSize: "1.5rem",
  }
}, { global: true });

mount(App, "#app");
