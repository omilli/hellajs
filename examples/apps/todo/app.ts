import { html, render } from "../../../lib";
import { TodoAdd } from "./components/add";
import { TodoFilter } from "./components/filter";
import { TodoList } from "./components/list";
import { resetTodos } from "./store";

const { div, h1 } = html;

const TodoApp = () => {
  resetTodos();
  return div([h1("Todo App"), TodoAdd, TodoFilter, TodoList]);
};

render(TodoApp, "#app");
