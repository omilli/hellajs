import { signal } from "@hellajs/core";
import { router } from "@hellajs/router";
import { mount, slot } from "@hellajs/dom";
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

const Counter = () => {
  const count = signal(0);
  const Provider = slot((props, children) => (
    <div {...props}>
      {children}
      <p>Count: {() => count()}</p>
      <button onclick={() => count(count() + 1)}>Increment</button>
    </div>
  ));
  return { Provider, count };
}


const App = () => {
  const Counter1 = Counter();
  const Counter2 = Counter();
  return (
    <>
      <Counter1.Provider class="counter-provider">
        <p>Count1: {() => Counter1.count()}</p>
        <button onclick={() => Counter1.count(Counter1.count() + 1)}>Increment</button>
      </Counter1.Provider>
      <Counter2.Provider class="counter-provider">
        <p>Count2: {() => Counter2.count()}</p>
        <button onclick={() => Counter2.count(Counter2.count() + 1)}>Increment</button>
      </Counter2.Provider>
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