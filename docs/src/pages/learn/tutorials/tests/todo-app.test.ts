import { describe, test, expect, beforeEach, mock } from "bun:test"
import { mount, html, ForEach } from "@hellajs/dom/bundle"

interface Todo {
  id: number
  text: string
  completed: boolean
}

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
})

describe("todo tutorial — basic list", () => {
  test("addTodo appends item and clears input", () => {
    const todos = signal<Todo[]>([])
    const newTodoText = signal("")

    const addTodo = () => {
      const text = newTodoText().trim()
      if (!text) return
      todos([...todos(), { id: Date.now(), text, completed: false }])
      newTodoText("")
    }

    addTodo()
    expect(todos()).toHaveLength(0)

    newTodoText("Learn HellaJS")
    addTodo()
    expect(todos()).toHaveLength(1)
    expect(todos()[0].text).toBe("Learn HellaJS")
    expect(newTodoText()).toBe("")
  })

  test("toggleTodo flips completed state", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "Learn", completed: false }
    ])

    const toggleTodo = (id: number) => {
      todos(todos().map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      ))
    }

    toggleTodo(1)
    expect(todos()[0].completed).toBe(true)

    toggleTodo(1)
    expect(todos()[0].completed).toBe(false)
  })

  test("removeTodo filters out by id", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "A", completed: false },
      { id: 2, text: "B", completed: false }
    ])

    const removeTodo = (id: number) => {
      todos(todos().filter(todo => todo.id !== id))
    }

    removeTodo(1)
    expect(todos()).toHaveLength(1)
    expect(todos()[0].text).toBe("B")
  })

  test("ForEach renders todo list reactively", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "First", completed: false },
      { id: 2, text: "Second", completed: false }
    ])

    const template = html`<ul id="list">
      <${ForEach} each=${todos} use=${(todo: Todo) => html`<li key=${todo.id}>${todo.text}</li>`} />
    </ul>`

    mount(template, "#app")

    const list = document.getElementById("list")!
    const items = list.querySelectorAll("li")
    expect(items).toHaveLength(2)
    expect(items[0]!.textContent).toBe("First")
    expect(items[1]!.textContent).toBe("Second")

    todos([...todos(), { id: 3, text: "Third", completed: false }])
    flush()

    expect(list.querySelectorAll("li")).toHaveLength(3)
  })
})

describe("todo tutorial — filtering and statistics", () => {
  test("filteredTodos returns correct subset per filter", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "A", completed: false },
      { id: 2, text: "B", completed: true },
      { id: 3, text: "C", completed: false }
    ])
    const filter = signal<"all" | "active" | "completed">("all")

    const filteredTodos = computed(() => {
      const allTodos = todos()
      switch (filter()) {
        case "active": return allTodos.filter(t => !t.completed)
        case "completed": return allTodos.filter(t => t.completed)
        default: return allTodos
      }
    })

    expect(filteredTodos()).toHaveLength(3)

    filter("active")
    expect(filteredTodos()).toHaveLength(2)

    filter("completed")
    expect(filteredTodos()).toHaveLength(1)
    expect(filteredTodos()[0].text).toBe("B")
  })

  test("stats computed tracks total, active, completed counts", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "A", completed: false },
      { id: 2, text: "B", completed: true },
      { id: 3, text: "C", completed: false }
    ])

    const stats = computed(() => {
      const allTodos = todos()
      return {
        total: allTodos.length,
        active: allTodos.filter(t => !t.completed).length,
        completed: allTodos.filter(t => t.completed).length
      }
    })

    expect(stats()).toEqual({ total: 3, active: 2, completed: 1 })

    todos([...todos(), { id: 4, text: "D", completed: true }])
    expect(stats()).toEqual({ total: 4, active: 2, completed: 2 })
  })
})

describe("todo tutorial — interactive editing", () => {
  test("startEditing sets editingId and editText", () => {
    const editingId = signal<number | null>(null)
    const editText = signal("")

    const startEditing = (id: number, currentText: string) => {
      editingId(id)
      editText(currentText)
    }

    startEditing(42, "Learn HellaJS")
    expect(editingId()).toBe(42)
    expect(editText()).toBe("Learn HellaJS")
  })

  test("saveEdit updates todo text and clears edit state", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "Old", completed: false }
    ])
    const editingId = signal<number | null>(1)
    const editText = signal("New")

    const saveEdit = () => {
      const id = editingId()!
      const newText = editText().trim()
      if (!newText) {
        todos(todos().filter(todo => todo.id !== id))
      } else {
        todos(todos().map(todo =>
          todo.id === id ? { ...todo, text: newText } : todo
        ))
      }
      editingId(null)
      editText("")
    }

    saveEdit()
    expect(todos()[0].text).toBe("New")
    expect(editingId()).toBe(null)
    expect(editText()).toBe("")
  })

  test("saveEdit with empty text removes the todo", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "Keep", completed: false },
      { id: 2, text: "Remove", completed: false }
    ])
    const editingId = signal<number | null>(2)
    const editText = signal("   ")

    const saveEdit = () => {
      const id = editingId()!
      const newText = editText().trim()
      if (!newText) {
        todos(todos().filter(todo => todo.id !== id))
      } else {
        todos(todos().map(todo =>
          todo.id === id ? { ...todo, text: newText } : todo
        ))
      }
      editingId(null)
      editText("")
    }

    saveEdit()
    expect(todos()).toHaveLength(1)
    expect(todos()[0].text).toBe("Keep")
    expect(editingId()).toBe(null)
  })

  test("cancelEdit clears editing state without saving", () => {
    const editingId = signal<number | null>(5)
    const editText = signal("draft")

    const cancelEdit = () => {
      editingId(null)
      editText("")
    }

    cancelEdit()
    expect(editingId()).toBe(null)
    expect(editText()).toBe("")
  })
})

describe("todo tutorial — state persistence", () => {
  test("effect updates document title based on active count", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "A", completed: false },
      { id: 2, text: "B", completed: true }
    ])

    effect(() => {
      const activeCount = todos().filter(t => !t.completed).length
      document.title = activeCount === 0
        ? "Todo App"
        : `Todo App (${activeCount} active)`
    })

    expect(document.title).toBe("Todo App (1 active)")

    todos(todos().map(t => ({ ...t, completed: true })))
    expect(document.title).toBe("Todo App")
  })

  test("clearCompleted removes finished todos", () => {
    const todos = signal<Todo[]>([
      { id: 1, text: "A", completed: false },
      { id: 2, text: "B", completed: true },
      { id: 3, text: "C", completed: true }
    ])

    const clearCompleted = () => {
      todos(todos().filter(todo => !todo.completed))
    }

    clearCompleted()
    expect(todos()).toHaveLength(1)
    expect(todos()[0].text).toBe("A")
  })
})
