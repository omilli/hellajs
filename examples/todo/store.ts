import { effect, resource, store } from "../../src/reactive";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  addedAt: Date;
  completedAt?: Date;
}

type FilterType = "all" | "completed" | "incomplete";

interface TodoStore {
  todos: Todo[];
  filteredTodos: Todo[];
  filter: FilterType;
}

const todosResource = resource<{ todos: Todo[] }>("/todos.json", {
  transform: (data) => ({
    todos: data.todos.map((todo) => ({
      ...todo,
      addedAt: new Date(todo.addedAt),
      completedAt: todo.completedAt ? new Date(todo.completedAt) : undefined,
    })),
  }),
  onError: (response) => console.log(response),
});

export const todoStore = store<TodoStore>((state) => {
  effect(() => {
    const todos = todosResource.data()?.todos || [];
    state.todos.set(todos);
    state.filteredTodos.set(filteredTodos(todos));
  });

  return {
    resource: todosResource,
    todos: [],
    filteredTodos: [],
    filter: "all",
  };
});

export function addTodo(text: string) {
  todoStore.todos.set([
    ...todoStore.todos(),
    {
      id: crypto.randomUUID(),
      text,
      completed: false,
      addedAt: new Date(),
    },
  ]);
}

export function toggleTodo(id: string) {
  todoStore.todos.set(
    todoStore.todos().map((todo) =>
      todo.id === id
        ? {
            ...todo,
            completed: !todo.completed,
            completedAt: !todo.completed ? new Date() : undefined,
          }
        : todo
    )
  );
}

export function setTodoFilter(filter: FilterType) {
  todoStore.filter.set(filter);
}

export function resetTodos() {
  todoStore.todos.set([]);
  todoStore.filter.set("all");
  todosResource.fetch();
}

function filteredTodos(todos: Todo[]): Todo[] {
  switch (todoStore.filter()) {
    case "completed":
      return todos.filter((t) => t.completed);
    case "incomplete":
      return todos.filter((t) => !t.completed);
    default:
      return todos;
  }
}
