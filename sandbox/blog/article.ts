import { effect, mount, route, signal, html, resource, show, type ResourceReturn } from "@hellajs/core";
import type { Post } from "./types";

const { div, h1, p } = html;

export function Article() {
  let postResource: ResourceReturn<Post>;
  const post = signal<Post | undefined>(undefined);
  let id: string | undefined;

  effect(() => {
    id = route().params.id;
    if (!id) return;
    postResource = resource<Post>(`https://jsonplaceholder.typicode.com/posts/${id}`);
  });

  effect(() => {
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
