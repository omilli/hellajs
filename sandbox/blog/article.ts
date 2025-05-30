import { signal, effect } from "../../packages/core";
import { html, show } from "../../packages/dom";
import { resource } from "../../packages/resource";
import { route } from "../../packages/router";
import type { Post } from "./types";

const { div, h1, p } = html;

export function Article() {
  const post = signal<Post | undefined>(undefined);
  const id = route().params.id;
  const postResource = resource<Post>(`https://jsonplaceholder.typicode.com/posts/${id}`);

  effect(() => {
    console.log(postResource.data())
    post.set(postResource.data());
  });

  return div({ class: "post" },
    show(
      post,
      div({ class: "post-details" },
        h1(() => post()?.title),
        p(() => post()?.body),
      ),
      div(() => `Loading post...${id}`),
    )
  )
}
