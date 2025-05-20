import { effect, router, type VNode, mount, signal, html } from "@hellajs/core";

let component = signal<VNode>(html.div(
  "Loading..."
));

router({
  "/": () => {
    import("./feed").then((m) => component.set(m.Feed()));
  },
  "/post/:id": () => {
    import("./article").then((m) => component.set(m.Article()));
  },
})

effect(() => mount(component()))