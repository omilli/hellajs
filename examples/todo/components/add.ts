import { html, signal } from "../../../src";
import { addTodo } from "../store";

const { form, input, button } = html;
const todoInput = signal("");

export const TodoAdd = form(
  {
    onsubmit(e: Event) {
      e.preventDefault();
      const value = todoInput().trim();
      if (value === "") return;
      addTodo(value);
      todoInput.set("");
      (e.target as HTMLFormElement).reset();
    },
  },
  [
    input({
      type: "text",
      placeholder: "Add new todo",
      onchange(e) {
        todoInput.set((e.target as HTMLInputElement).value);
      },
    }),
    button({ type: "submit" }, "Add"),
  ]
);
