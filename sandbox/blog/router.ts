import { router, mount, html, signal } from "@hellajs/core";
import { Feed } from "./feed";

const activeRoute = signal(html.div("Loading..."));

router({
  "/": () => import("./feed").then((m) => activeRoute.set(m.Feed())),
  "/post/:id": () => import("./article").then((m) => activeRoute.set(m.Article())),
})

function App() {
  return html.main(
    html.h1("HellaJS Blog Example"),
    html.div({ id: "content" },
      activeRoute
    )
  );
}

mount(App);