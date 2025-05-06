import {
  html,
  signal,
  batch,
  untracked,
  Component,
  For,
  render
} from "@hellajs/core";

// Deconstruct html helpers for easier access
const {
  div,
  span,
  button,
  form,
  input,
  ul,
  li,
  h1
} = html;

// Todo item type
type Todo = { id: number; text: string; completed: boolean };

// Main app state
const todos = signal<Todo[]>([]);
const history = signal<Todo[][]>([[]]);
const historyIndex = signal(0);

// Add, toggle, remove, undo, redo logic
function addTodo(text: string) {
  batch(() => {
    const next = [...todos(), { id: Date.now(), text, completed: false }];
    todos.set(next);
    pushHistory(next);
  });
}
function toggleTodo(id: number) {
  batch(() => {
    const next = todos().map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    todos.set(next);
    pushHistory(next);
  });
}
function removeTodo(id: number) {
  batch(() => {
    const next = todos().filter(t => t.id !== id);
    todos.set(next);
    pushHistory(next);
  });
}
function pushHistory(next: Todo[]) {
  // Untracked to avoid infinite loops
  untracked(() => {
    const idx = historyIndex();
    const prev = history().slice(0, idx + 1);
    history.set([...prev, next]);
    historyIndex.set(prev.length);
  });
}
function undo() {
  if (historyIndex() > 0) {
    historyIndex.set(historyIndex() - 1);
    todos.set(untracked(() => history()[historyIndex()]));
  }
}
function redo() {
  if (historyIndex() < history().length - 1) {
    historyIndex.set(historyIndex() + 1);
    todos.set(untracked(() => history()[historyIndex()]));
  }
}

// Theme switcher component (now just toggles a local signal)
const ThemeSwitcher = Component(() => {
  const theme = signal<"light" | "dark">("light");
  return div(
    span("Theme: "),
    button(
      { onclick: () => theme.set(theme() === "light" ? "dark" : "light") },
      theme() === "light" ? "Switch to Dark" : "Switch to Light"
    )
  );
});

// Todo input component
const TodoInput = Component(() => {
  let inputValue = "";
  return form(
    {
      onsubmit: e => {
        e.preventDefault();
        if (inputValue.trim()) addTodo(inputValue.trim());
        inputValue = "";
        (e.target as HTMLFormElement).reset();
      }
    },
    input({
      type: "text",
      placeholder: "Add a todo...",
      oninput: e => (inputValue = (e.target as HTMLInputElement).value)
    }),
    button({ type: "submit" }, "Add")
  );
});

// Todo list item component (theme is now always light)
const TodoItem = (props: { todo: Todo }) => Component(() => {
  const { todo } = props;
  return li(
    {
      key: todo.id,
      style: `color:#222;background:#fff;`,
      onclick: () => toggleTodo(todo.id)
    },
    span(
      { style: `text-decoration:${todo.completed ? "line-through" : "none"}` },
      todo.text
    ),
    button(
      {
        onclick: e => {
          e.stopPropagation();
          removeTodo(todo.id);
        },
        style: "margin-left:1em"
      },
      "Remove"
    )
  );
});

// Todo list component
const TodoList = Component(() =>
  ul(
    For(todos, (todo) => TodoItem({ todo })())
  )
);

// Undo/Redo controls (directly uses undo/redo)
const UndoRedo = Component(() => {
  return div(
    button({ onclick: undo, disabled: historyIndex() === 0 }, "Undo"),
    button({ onclick: redo, disabled: historyIndex() === history().length - 1 }, "Redo")
  );
});

// App component without providers
const App = Component(() =>
  div(
    h1("Collaborative Todo List"),
    ThemeSwitcher(),
    TodoInput(),
    UndoRedo(),
    TodoList()
  )
);

// Mount the app
render(App, "#app");