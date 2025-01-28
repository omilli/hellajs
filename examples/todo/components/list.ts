import { html } from "../../../src";
import { filteredTodos } from "../store";
import { TodoItem } from "./item";

const { div, ul } = html;

export const TodoList = ul(() => {
  const todos = filteredTodos();
  const loading = div("Loading...");
  const list = todos.map((todo) => TodoItem(todo));
  return todos.length === 0 ? loading : list;
});
