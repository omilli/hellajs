import { signal, effect } from "../../packages/core";
import { html, forEach, show, css } from "../../packages/dom/lib";
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

  const baseStyle = css({
    textTransform: "capitalize",
  }, {
    name: "base"
  });

  const listStyle = css({
    ":hover": {
      backgroundColor: "#f0f0f0",
      "@media (max-width: 600px)": {
        "$div": {
          textDecoration: "underline",
          "& .odd": {
            color: "purple",
            ":hover": {
              textTransform: "uppercase"
            }
          },
          ".even": {
            color: "orange"
          }
        }
      }
    }
  }, {
    name: "list-item",
    scoped: "feed"
  });

  return html.div({ class: "feed" },
    html.h1("Blog Feed"),
    show(
      [postsResource.loading, html.p("Loading posts...")],
      [postsResource.error, html.p("Error loading posts")],
      html.ul(
        forEach(posts, post =>
          html.li(
            {
              key: post.id,
              class: [baseStyle, listStyle],
              onclick: () => navigate(`/post/${post.id}`)
            },
            html.div(
              html.span({
                class: [baseStyle, post.id % 2 === 0 ? "even" : "odd"]
              }, post.title))
          )
        ),
      ),
    )
  )
}
