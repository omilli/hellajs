import { signal, effect } from "../../packages/core";
import { html } from "../../packages/dom";
import { resource } from "../../packages/resource";
import { route } from "../../packages/router";
import type { Post } from "./types";

export function Article() {
  const post = signal<Post | undefined>(undefined);
  const id = route().params.id;
  const postResource = resource<Post>(`https://jsonplaceholder.typicode.com/posts/${id}`);

  effect(() => {
    console.log(postResource.data())
    post(postResource.data());
  });

  return html.div({ class: "post" },
    () => (
      post() ?
        html.div({ class: "post-details" },
          html.h1(() => post()?.title),
          html.p(() => post()?.body),
        )
        :
        html.div(() => `Loading post...${id}`)
    )
  )
}
