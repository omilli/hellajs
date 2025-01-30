import { html } from "../../../src";
import { filteredTodos, todoStore } from "../store";
import { TodoItem } from "./item";

const { div, ul } = html;

export const TodoList = ul(() => {
  const loading = div("Loading...");
  const todos = filteredTodos().map((todo) => TodoItem(todo));
  return todos.length === 0 ? loading : todos;
});
