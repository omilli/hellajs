import { html } from "../../src";
import { TodoAdd } from "./components/add";
import { TodoFilter } from "./components/filter";
import { TodoList } from "./components/list";
import { resetTodos } from "./store";
import { todoStyles } from "./styles";

const { div, h1 } = html;

export const TodoApp = () => {
  resetTodos();
  return div(
    {
      mount: "app",
      css: todoStyles,
    },
    [h1("Todo App"), TodoAdd, TodoFilter, TodoList]
  );
};
