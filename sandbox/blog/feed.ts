import { resource, signal, effect, html, show, mount, forEach, navigate } from "@hellajs/core";
import type { Post } from "./types";

export function Feed() {
  const { div, h1, ul, li, p } = html;

  const postsResource = resource<Post[]>('https://jsonplaceholder.typicode.com/posts');
  const posts = signal<Post[]>([]);

  effect(() => {
    const postsData = postsResource.data();
    if (!postsData) return;
    posts(postsResource.data());
  });

  return div({ class: "feed" },
    h1("Blog Feed"),
    show(
      [postsResource.loading, p("Loading posts...")],
      [postsResource.error, p("Error loading posts")],
      ul({ class: "posts" },
        forEach(posts, post =>
          li({ key: post.id, onclick: () => navigate(`/post/${post.id}`) },
            post.title
          )
        ),
      ),
    )
  )
}
