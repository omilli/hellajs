import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";
import { mount } from "@hellajs/dom";
import { css } from "@hellajs/css";

import { Header } from "./components/Header";


// A Signal holding the current page content
const page = signal(<>Loading...</>);

// Set the page signal when the route changes
router({
  "/": () => import("./pages/Collection").then(m => page(m.Collection())),
  "/create": () => import("./pages/Create").then(m => page(m.Create())),
});

// Set some global styles
css({
  "*": {
    boxSizing: "border-box",
  },
  body: {
    margin: 0,
    fontFamily: "sans-serif",
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
      {/*
        Don't call page()
        Pass a reference to make it reactive 
      */}
      <main class="container">
        {page}
      </main>
    </>
  );
}

// Looks for "#app" automatically
mount(App, "#app");