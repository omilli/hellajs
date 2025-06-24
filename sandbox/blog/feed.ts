
import { signal, effect } from "../../packages/core";
import { html, forEach, show } from "../../packages/dom";
import { resource } from "../../packages/resource";
import { navigate } from "../../packages/router";

import type { Post } from "./types";

export function Feed() {

  const postsResource = resource<Post[]>('https://jsonplaceholder.typicode.com/posts');
  const posts = signal<Post[]>([]);

  effect(() => {
    const postsData = postsResource.data();
    if (!postsData) return;
    posts(postsData);
  });

  return html.div({ class: "feed" },
    html.h1("Blog Feed"),
    show(
      [postsResource.loading, html.p("Loading posts...")],
      [postsResource.error, html.p("Error loading posts")],
      html.ul({ class: "posts" },
        forEach(posts, post =>
          html.li({ key: post.id, onclick: () => navigate(`/post/${post.id}`) },
            post.title
          )
        ),
      ),
    )
  )
}
