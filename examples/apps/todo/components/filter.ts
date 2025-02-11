import { html } from "../../../../lib";
import { setTodoFilter, todoStore } from "../store";

const { div, button } = html;

export const TodoFilter = div([
  button(
    {
      onclick: () => setTodoFilter("all"),
      classes: {
        active: todoStore.filter() === "all",
      },
    },
    "All"
  ),
  button(
    {
      onclick: () => setTodoFilter("completed"),
      classes: {
        active: todoStore.filter() === "completed",
      },
    },
    "Completed"
  ),
  button(
    {
      onclick: () => setTodoFilter("incomplete"),
      classes: {
        active: todoStore.filter() === "incomplete",
      },
    },
    "Incomplete"
  ),
]);
