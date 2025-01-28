import { render, router } from "../src";
import { BenchApp } from "./benchmark/app";
import { TodoApp } from "./todo/app";

router.start({
  "/bench": () => {
    render(BenchApp);
  },
  "/todo": () => {
    render(TodoApp);
  },
});
