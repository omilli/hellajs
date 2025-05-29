import { router, mount, html, routerOutlet } from "@hellajs/core";

router({
  "/": () => import("./feed").then((m) => m.Feed()),
  "/post/:id": () => import("./article").then((m) => m.Article()),
})

function App() {
  return html.main(
    html.h1("HellaJS Blog Example"),
    html.div({ id: "content" },
      routerOutlet()
    )
  );
}

mount(App);