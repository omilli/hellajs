import { signal } from "@hellajs/core";
import { route } from "@hellajs/router";

export const currentView = signal(<h1>Loading…</h1>);

const Home = () => <h1>Home</h1>;
const User = ({ id }: { id: string }) => <h1>User {id}</h1>;
const NotFound = () => <h1>Not Found</h1>;

export const routes = {
  "/": () => currentView(Home()),
  "/users/:id": ({ id }: { id?: string }) => currentView(User({ id: id ?? "" })),
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
