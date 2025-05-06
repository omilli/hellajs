import {
  html,
  signal,
  batch,
  untracked,
  For,
  render,
  computed
} from "@hellajs/core";
import type { VNode } from "../lib/types";

// HTML helpers
const {
  $,
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

// --- Reactive State ---
const theme = signal<"light" | "dark">("light");
const todos = signal<Todo[]>([]); // main todo list
const todoInput = signal(""); // input value for new todo
const history = signal<Todo[][]>([[]]); // undo/redo history
const historyIndex = signal(0); // current history index

// --- Todo Actions ---

// Add a new todo and update history
function addTodo(text: string) {
  batch(() => {
    const next = [...todos(), { id: Date.now(), text, completed: false }];
    todos.set(next);
    pushHistory(next);
  });
}

// Toggle completed state for a todo
function toggleTodo(id: number) {
  batch(() => {
    const next = todos().map(t => t.id === id ? { ...t, completed: !t.completed } : t);
    todos.set(next);
    pushHistory(next);
  });
}

// Remove a todo and update history
function removeTodo(id: number) {
  batch(() => {
    const next = todos().filter(t => t.id !== id);
    todos.set(next);
    pushHistory(next);
  });
}

// Push new state to history for undo/redo
function pushHistory(next: Todo[]) {
  untracked(() => {
    const idx = historyIndex();
    const prev = history().slice(0, idx + 1);
    history.set([...prev, next]);
    historyIndex.set(prev.length);
  });
}

// Undo last change if possible
function undo() {
  if (historyIndex() > 0) {
    historyIndex.set(historyIndex() - 1);
    todos.set(untracked(() => history()[historyIndex()]));
  }
}

// Redo next change if possible
function redo() {
  if (historyIndex() < history().length - 1) {
    historyIndex.set(historyIndex() + 1);
    todos.set(untracked(() => history()[historyIndex()]));
  }
}

// --- UI Components ---

const style = () => {
  let color = theme() === "light" ? "#222" : "#fff";
  let background = theme() === "light" ? "#fff" : "#222";
  return `background:${background}; color:${color};`
}

// Theme toggle for children
// Uses Component to manage its own state
const ThemeSwitcher = (children: VNode[]) => {
  const foo = computed(() => theme())
  return div(
    { style },
    span("Theme: "),
    button(
      { onclick: () => theme.set(theme() === "light" ? "dark" : "light"), style },
      () => theme() === "light" ? "Switch to Dark" : "Switch to Light"
    ),
    div(
      ...children
    )
  );
};

ThemeSwitcher.onMount = () => {
  console.log("Theme starts as", theme());
}

ThemeSwitcher.onUpdate = () => {
  console.log("Theme updated to:", theme());
}

// Form for adding todos
const TodoInput = form(
  {
    onsubmit: e => {
      e.preventDefault();
      if (todoInput().trim()) addTodo(todoInput().trim());
      todoInput.set("");
      (e.target as HTMLFormElement).reset();
    }
  },
  input({
    type: "text",
    style,
    placeholder: "Add a todo...",
    oninput: e => (todoInput.set((e.target as HTMLInputElement).value))
  }),
  button({ type: "submit", style }, "Add")
)

// Single todo item with toggle and remove
const TodoItem = (todo: Todo) => {
  return li(
    {
      key: todo.id,
      style,
      onclick: () => toggleTodo(todo.id)
    },
    span(
      {
        style: `text-decoration:${todo.completed ? "line-through" : "none"}`
      },
      todo.text
    ),
    button(
      {
        onclick: e => {
          e.stopPropagation();
          removeTodo(todo.id);
        },
        style
      },
      "Remove"
    )
  )
};

// List of todos
const TodoList = ul(
  For(todos, (todo) => TodoItem(todo))
)

// Undo/Redo controls
const UndoRedo = div(
  button({ style, onclick: undo, disabled: () => historyIndex() === 0 }, "Undo"),
  button({ style, onclick: redo, disabled: () => historyIndex() === history().length - 1 }, "Redo")
);

// Main app UI
const App = $(
  ThemeSwitcher([
    h1("Collaborative Todo List"),
    TodoInput,
    UndoRedo,
    TodoList
  ])
)

// Mount the app to the DOM
render(App, "#app");