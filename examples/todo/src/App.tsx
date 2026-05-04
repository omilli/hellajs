import { signal, computed, effect } from "@hellajs/core";
import { mount, ForEach } from "@hellajs/dom";

type FilterType = 'all' | 'active' | 'completed';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

// Load todos from localStorage
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

  // Persist todos to localStorage
  effect(() => {
    localStorage.setItem('hellajs-todos', JSON.stringify(todos()));
  });

  // Update document title
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
    <div class="p-4 max-w-md mx-auto">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl">Todo App</h1>
        <div class="text-sm text-gray-500">
          {() => stats().active} active, {() => stats().completed} done
        </div>
      </div>

      <div class="flex gap-2 mb-4">
        <input
          type="text"
          bind:value={newTodoText}
          on:input={e => newTodoText((e.target as HTMLInputElement).value)}
          on:keydown={e => e.key === 'Enter' && addTodo()}
          placeholder="What needs to be done?"
          class="flex-1 px-3 py-2 border rounded"
        />
        <button on:click={addTodo} class="px-4 py-2 bg-blue-500 text-white rounded">
          Add
        </button>
      </div>

      <div class="flex gap-2 mb-4">
        <button
          bind:class={() => `px-3 py-1 rounded text-sm ${filter() === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          on:click={() => filter('all')}
        >
          All ({() => stats().total})
        </button>
        <button
          bind:class={() => `px-3 py-1 rounded text-sm ${filter() === 'active' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          on:click={() => filter('active')}
        >
          Active ({() => stats().active})
        </button>
        <button
          bind:class={() => `px-3 py-1 rounded text-sm ${filter() === 'completed' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          on:click={() => filter('completed')}
        >
          Done ({() => stats().completed})
        </button>
        {() => stats().completed > 0 && (
          <button
            on:click={clearCompleted}
            class="px-3 py-1 rounded text-sm bg-red-100 text-red-700 hover:bg-red-200"
          >
            Clear Done
          </button>
        )}
      </div>

      <ul class="space-y-2">
        <ForEach each={filteredTodos} use={(todo) => (
          <li key={todo.id} class="flex items-center gap-2 p-2 border rounded">
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
                class="flex-1 px-2 py-1 border rounded"
                autofocus
              />
            ) : (
              <span
                bind:class={() => `flex-1 cursor-pointer ${todo.completed ? 'line-through text-gray-500' : ''}`}
                on:dblclick={() => startEditing(todo.id, todo.text)}
                title="Double-click to edit"
              >
                {todo.text}
              </span>
            )}
            <div class="flex gap-1">
              {() => editingId() === todo.id ? (
                <>
                  <button on:click={saveEdit} class="px-2 py-1 bg-green-500 text-white rounded text-sm">✓</button>
                  <button on:click={cancelEdit} class="px-2 py-1 bg-gray-500 text-white rounded text-sm">✕</button>
                </>
              ) : (
                <button on:click={() => removeTodo(todo.id)} class="px-2 py-1 bg-red-500 text-white rounded text-sm">
                  Delete
                </button>
              )}
            </div>
          </li>
        )} />
      </ul>

      {() => filteredTodos().length === 0 && (
        <div class="text-center text-gray-500 mt-4">
          {() => filter() === 'all' && "No todos yet! Add one above."}
          {() => filter() === 'active' && "No active todos. Great job!"}
          {() => filter() === 'completed' && "No completed todos yet."}
        </div>
      )}
    </div>
  );
};

mount(TodoApp, '#app');