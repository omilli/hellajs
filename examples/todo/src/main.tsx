import { signal, computed, effect } from "@hellajs/core";
import { mount, ForEach } from "@hellajs/dom";
import { css } from "@hellajs/css";

css({
  body: {
    margin: 0,
    fontFamily:
    'sans-serif'
  }
});

const app = css({
  width: '100%',
  maxWidth: '30rem',
  margin: '0 auto',
  padding: '1rem',
  'h1': {
    marginBottom: '1rem'
  },
  'button': {
    cursor: 'pointer'
  },
}, { name: 'app' });

const row = css({
  display: 'flex',
  gap: '0.5rem'
}, { name: 'row' });

const list = css({
  listStyle: 'none',
  padding: 0,
  'li': {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
}, { name: 'list' });

const flex = css({
  flex: '1'
}, { name: 'flex' });

const done = css({
  textDecoration: 'line-through',
  color: '#999'
}, { name: 'done' });

type FilterType = 'all' | 'active' | 'completed';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

const loadTodos = (): Todo[] => {
  try {
    const saved = localStorage.getItem('hellajs-todos');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: 'Learn HellaJS', completed: false },
      { id: 2, text: 'Build a todo app', completed: false }
    ];
  } catch {
    return [];
  }
};

const TodoApp = () => {
  const todos = signal<Todo[]>(loadTodos());
  const newTodoText = signal('');
  const filter = signal<FilterType>('all');
  const editingId = signal<number | null>(null);
  const editText = signal('');

  effect(() => {
    localStorage.setItem('hellajs-todos', JSON.stringify(todos()));
  });

  effect(() => {
    const activeCount = todos().filter(t => !t.completed).length;
    document.title = activeCount === 0
      ? 'Todo App'
      : `Todo App (${activeCount} active)`;
  });

  const filteredTodos = computed(() => {
    const allTodos = todos();
    switch (filter()) {
      case 'active': return allTodos.filter(t => !t.completed);
      case 'completed': return allTodos.filter(t => t.completed);
      default: return allTodos;
    }
  });

  const stats = computed(() => {
    const allTodos = todos();
    return {
      total: allTodos.length,
      active: allTodos.filter(t => !t.completed).length,
      completed: allTodos.filter(t => t.completed).length
    };
  });

  const addTodo = () => {
    const text = newTodoText().trim();
    if (!text) return;
    todos([...todos(), { id: Date.now(), text, completed: false }]);
    newTodoText('');
  };

  const toggleTodo = (id: number) => {
    todos(todos().map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const removeTodo = (id: number) => {
    todos(todos().filter(todo => todo.id !== id));
  };

  const clearCompleted = () => {
    todos(todos().filter(todo => !todo.completed));
  };

  const startEditing = (id: number, currentText: string) => {
    editingId(id);
    editText(currentText);
  };

  const saveEdit = () => {
    const id: number = editingId()!;
    const newText = editText().trim();
    if (!newText) {
      removeTodo(id);
    } else {
      todos(todos().map(todo =>
        todo.id === id ? { ...todo, text: newText } : todo
      ));
    }
    editingId(null);
    editText('');
  };

  const cancelEdit = () => {
    editingId(null);
    editText('');
  };

  const handleEditKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
  };

  return (
    <div class={app}>
      <h1>Todo App</h1>
      <div>{() => stats().active} active, {() => stats().completed} done</div>

      <div class={row}>
        <input
          type="text"
          bind:value={newTodoText}
          on:input={e => newTodoText((e.target as HTMLInputElement).value)}
          on:keydown={e => e.key === 'Enter' && addTodo()}
          placeholder="What needs to be done?"
          class={flex}
        />
        <button on:click={addTodo}>Add</button>
      </div>

      <div class={row}>
        <button on:click={() => filter('all')}>
          All ({() => stats().total})
        </button>
        <button on:click={() => filter('active')}>
          Active ({() => stats().active})
        </button>
        <button on:click={() => filter('completed')}>
          Done ({() => stats().completed})
        </button>
        {() => stats().completed > 0 && (
          <button on:click={clearCompleted}>Clear Done</button>
        )}
      </div>

      <ul class={list}>
        <ForEach each={filteredTodos} use={(todo) => (
          <li key={todo.id}>
            <input
              type="checkbox"
              checked={todo.completed}
              on:change={() => toggleTodo(todo.id)}
            />
            {() => editingId() === todo.id ? (
              <input
                type="text"
                bind:value={editText}
                on:input={e => editText((e.target as HTMLInputElement).value)}
                on:keydown={handleEditKeydown}
                on:blur={saveEdit}
                class={flex}
                autofocus
              />
            ) : (
              <span
                bind:class={() => [flex, todo.completed && done]}
                on:dblclick={() => startEditing(todo.id, todo.text)}
                title="Double-click to edit"
              >
                {todo.text}
              </span>
            )}
            {() => editingId() === todo.id ? (
              <>
                <button on:click={saveEdit}>✓</button>
                <button on:click={cancelEdit}>✕</button>
              </>
            ) : (
              <button on:click={() => removeTodo(todo.id)}>Delete</button>
            )}
          </li>
        )} />
      </ul>

      {() => filteredTodos().length === 0 && (
        <div>
          {() => filter() === 'all' && "No todos yet! Add one above."}
          {() => filter() === 'active' && "No active todos. Great job!"}
          {() => filter() === 'completed' && "No completed todos yet."}
        </div>
      )}
    </div>
  );
};

mount(TodoApp, '#app');
