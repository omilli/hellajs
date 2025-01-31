import { html } from "../../../src";
import { setTodoFilter, todoStore } from "../store";

const { div, button } = html;

export const TodoFilter = div({ class: "filters" }, () => [
  button(
    {
      onclick: () => setTodoFilter("all"),
      class: {
        active: todoStore.filter() === "all",
      },
    },
    "All"
  ),
  button(
    {
      onclick: () => setTodoFilter("completed"),
      class: {
        active: todoStore.filter() === "completed",
      },
    },
    "Completed"
  ),
  button(
    {
      onclick: () => setTodoFilter("incomplete"),
      class: {
        active: todoStore.filter() === "incomplete",
      },
    },
    "Incomplete"
  ),
]);
