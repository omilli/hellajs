import { batch, signal, computed, effect } from "@hellajs/core";
import { css, style } from "@hellajs/css";
import { mount, ForEach } from "@hellajs/dom";

css({
  body: {
    margin: 0,
    fontFamily: "sans-serif",
  },
});

const app = style({
  maxWidth: "30rem",
  margin: "0 auto",
});

const row = style({
  display: "flex",
  gap: "0.5rem",
  alignItems: "center",
});

const list = style({
  listStyle: "none",
  padding: 0,
});

const flex = style({
  flex: "1",
});

const done = style({
  textDecoration: "line-through",
  color: "#999",
});

type FilterType = "all" | "active" | "completed";

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const loadTodos = (): Todo[] => {
  try {
    const saved = localStorage.getItem("hellajs-todos");
    return saved
      ? JSON.parse(saved)
      : [
          { id: 1, text: "Learn HellaJS", completed: false },
          { id: 2, text: "Build a todo app", completed: false },
        ];
  } catch {
    return [];
  }
};

const TodoApp = () => {
  const todos = signal<Todo[]>(loadTodos());
  const newTodoText = signal("");
  const filter = signal<FilterType>("all");

  effect(() => {
    localStorage.setItem("hellajs-todos", JSON.stringify(todos()));
  });

  effect(() => {
    const activeCount = todos().filter((t) => !t.completed).length;
    document.title = activeCount === 0 ? "Todo App" : `Todo App (${activeCount} active)`;
  });

  const filteredTodos = computed(() => {
    const allTodos = todos();
    switch (filter()) {
      case "active":
        return allTodos.filter((t) => !t.completed);
      case "completed":
        return allTodos.filter((t) => t.completed);
      default:
        return allTodos;
    }
  });

  const stats = computed(() => {
    const allTodos = todos();
    return {
      total: allTodos.length,
      active: allTodos.filter((t) => !t.completed).length,
      completed: allTodos.filter((t) => t.completed).length,
    };
  });

  const addTodo = () => {
    const text = newTodoText().trim();
    if (!text) return;
    batch(() => {
      todos([...todos(), { id: Date.now(), text, completed: false }]);
      newTodoText("");
    });
  };

  const toggleTodo = (id: number) => {
    todos(todos().map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const removeTodo = (id: number) => {
    todos(todos().filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    todos(todos().filter((todo) => !todo.completed));
  };

  return (
    <div class={app}>
      <h1>Todo App</h1>
      <div>
        {stats().active} active, {stats().completed} done
      </div>

      <div class={row}>
        <input
          type="text"
          value={newTodoText}
          on:input={(e) => newTodoText((e.target as HTMLInputElement).value)}
          placeholder="What needs to be done?"
          class={flex}
        />
        <button on:click={addTodo}>Add</button>
      </div>

      <div class={row}>
        <button on:click={() => filter("all")}>All ({stats().total})</button>
        <button on:click={() => filter("active")}>Active ({stats().active})</button>
        <button on:click={() => filter("completed")}>Done ({stats().completed})</button>
        {stats().completed > 0 && <button on:click={clearCompleted}>Clear Done</button>}
      </div>

      <ul class={list}>
        <ForEach
          each={filteredTodos}
          use={(todo) => (
            <li class={row} key={todo.id}>
              <input
                type="checkbox"
                checked={todo.completed}
                on:change={() => toggleTodo(todo.id)}
              />
              <span class={[flex, todo.completed && done]}>{todo.text}</span>
              <button on:click={() => removeTodo(todo.id)}>Delete</button>
            </li>
          )}
        />
      </ul>

      {filteredTodos().length === 0 && (
        <div>
          {filter() === "all" && "No todos yet! Add one above."}
          {filter() === "active" && "No active todos. Great job!"}
          {filter() === "completed" && "No completed todos yet."}
        </div>
      )}
    </div>
  );
};

mount(TodoApp, "#app");
