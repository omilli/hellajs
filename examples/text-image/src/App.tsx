import { router } from "@hellajs/router";
import { mount } from "@hellajs/dom";
import { css, cssVars } from "../../../packages/css";

import { Header } from "./components/Header";
import { Collection } from "./pages/Collection";
import { Create } from "./pages/Create";

// A simple function that takes a JSX element and mounts it
const routerMount = (Page: JSX.Element) => mount(Page, "#router")

// Set the page signal when the route changes
router({
  routes: {
    "/": () => routerMount(<Collection />),
    "/create": () => routerMount(<Create />),
  }
});

const theme = cssVars({
  font: {
    family: "Arial, sans-serif",
  }
})

// Set some global styles
css({
  "*": {
    boxSizing: "border-box",
  },
  body: {
    margin: 0,
    fontFamily: theme.font.family,
  },
  a: {
    cursor: 'pointer',
    fontWeight: 'bold',
    color: "mediumslateblue"
  },
  ".container": {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "1rem",
  }
}, { global: true });


const App = () => {
  return (
    <>
      <Header />
      <main class="container" id="router">
        Loading...
      </main>
    </>
  );
}

// Looks for "#app" automatically
mount(App, "#app");