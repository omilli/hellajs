import { afterNavigate, beforeNavigate, router } from "../../../lib";

const appRouter = router();

const routes = {
  "/": "/hello",
  "/hello": async () => {
    const greeting = await new Promise((resolve) => resolve("Hello"));
    console.log(greeting);
  },
};

const destroyBefore = beforeNavigate(["/hello"], (path) => {
  console.log(`Navigating to ${path}`);
});

const destroyAfter = afterNavigate(["/hello"], (path) => {
  console.log(`Navigated to ${path}`);
});

appRouter.start(routes);

setTimeout(() => {
  destroyBefore();
  destroyAfter();
}, 5000);
