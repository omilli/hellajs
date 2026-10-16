import { signal } from "@hellajs/core";
import { route } from "@hellajs/router";

// The view signal holds the currently-rendered view node. Route handlers are
// pure setters; they update this signal and nothing else. The same handlers
// fire on the server (driven by router({ url })) and on the client (driven by
// router({ routes }) + hydrate), so the rendered view matches. The
// () => mount(...) style is client-only; mount needs a document and throws on
// the server.
export const currentView = signal(<h1>Loading…</h1>);

const Home = () => <h1>Home</h1>;
const User = ({ id }: { id: string }) => <h1>User {id}</h1>;
const NotFound = () => <h1>Not Found</h1>;

export const routes = {
  "/": () => currentView(Home()),
  "/users/:id": (params: Record<string, string>) => currentView(User({ id: params.id! })),
};

export const notFound = () => currentView(NotFound());

const activeClass = (path: string) => (route().active(path) ? "active" : "");

export const App = () => (
  <>
    <nav>
      <a href="/" class={activeClass("/")}>
        Home
      </a>
      <a href="/users/1" class={activeClass("/users/1")}>
        User
      </a>
    </nav>
    <main>{currentView}</main>
  </>
);
