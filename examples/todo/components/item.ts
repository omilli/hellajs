import { css, html } from "../../../src";
import { toggleTodo } from "../store";

const { div, li, input, span } = html;

type TodoItemProps = {
  id: string;
  text: string;
  completed: boolean;
  addedAt: Date;
  completedAt?: Date;
};

export const TodoItem = (props: TodoItemProps) => {
  const { id, text, completed, addedAt, completedAt } = props;
  return li(
    {
      css: css({
        display: "flex",
        alignItems: "top",
      }),
    },
    [
      input({
        type: "checkbox",
        checked: completed,
        onclick: () => toggleTodo(id),
      }),
      div([
        text,
        span({ class: "date" }, `Added: ${addedAt.toLocaleDateString()}`),
        completedAt &&
          span(
            { class: "date" },
            `Completed: ${completedAt?.toLocaleDateString()}`
          ),
      ]),
    ]
  );
};
