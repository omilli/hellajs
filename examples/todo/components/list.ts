import { html } from "../../../src";
import { filteredTodos } from "../store";
import { TodoItem } from "./item";

const { $, ul } = html;

export const TodoList = ul(() => {
  const loading = $("Loading...");
  const todos = filteredTodos().map((todo) => TodoItem(todo));
  return todos.length === 0 ? loading : todos;
});
