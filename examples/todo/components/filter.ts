import { html } from "../../../src";
import { setTodoFilter, todoStore } from "../store";

const { div, button } = html;

export const TodoFilter = div({ class: "filters" }, [
  button(
    {
      onclick: () => setTodoFilter("all"),
      class: () => (todoStore.filter() === "all" ? "active" : ""),
    },
    "All"
  ),
  button(
    {
      onclick: () => setTodoFilter("completed"),
      class: () => (todoStore.filter() === "completed" ? "active" : ""),
    },
    "Completed"
  ),
  button(
    {
      onclick: () => setTodoFilter("incomplete"),
      class: () => (todoStore.filter() === "incomplete" ? "active" : ""),
    },
    "Incomplete"
  ),
]);
