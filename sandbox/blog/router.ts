import { signal } from "../../packages/core";
import { mount, html } from "../../packages/dom";
import { navigate, router } from "../../packages/router";

const activeRoute = signal(html.div("Loading..."));

router({
  "/": () => import("./feed").then((m) => activeRoute(m.Feed())),
  "/post/:id": () => import("./article").then((m) => activeRoute(m.Article())),
})

function App() {
  return html.$(
    html.h1({ onclick: () => navigate("/") }, "HellaJS Blog Example"),
    html.div({ id: "content" },
      activeRoute
    )
  );
}

mount(App);