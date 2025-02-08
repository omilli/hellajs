import { html } from "../../../../lib";
import { toggleTodo } from "../store";

const { li, input, span } = html;

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
      class: {
        completed,
      },
    },
    [
      input({
        type: "checkbox",
        checked: completed,
        onclick: () => toggleTodo(id),
      }),
      span([
        text,
        `Added: ${addedAt.toLocaleDateString()}`,
        completedAt && ` Completed: ${completedAt?.toLocaleDateString()}`,
      ]),
    ]
  );
};
