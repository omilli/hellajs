import { describe, test, expect } from "bun:test"
import { store } from "@hellajs/store/bundle"

interface Task {
  id: number
  text: string
  done: boolean
}

describe("task-manager app", () => {
  test("store holds tasks, filter, and nextId", () => {
    const app = store({
      tasks: [
        { id: 1, text: "Learn HellaJS", done: false },
        { id: 2, text: "Build a task manager", done: false },
        { id: 3, text: "Ship to production", done: true },
      ] as Task[],
      filter: "all" as string,
      nextId: 4,
    })

    expect(app.tasks()).toHaveLength(3)
    expect(app.filter()).toBe("all")
    expect(app.nextId()).toBe(4)
  })

  test("addTask pushes new task via draft mutation and increments nextId", () => {
    const app = store({
      tasks: [] as Task[],
      filter: "all" as string,
      nextId: 1,
    })
    const newTask = signal("")

    const addTask = () => {
      const text = newTask().trim()
      if (!text) return
      app.update(d => {
        d.tasks.push({ id: d.nextId, text, done: false })
        d.nextId++
      })
      newTask("")
    }

    addTask()
    expect(app.tasks()).toHaveLength(0)

    newTask("Learn HellaJS")
    addTask()
    expect(app.tasks()).toHaveLength(1)
    expect(app.tasks()[0].text).toBe("Learn HellaJS")
    expect(app.nextId()).toBe(2)
    expect(newTask()).toBe("")
  })

  test("toggle flips done on matching task via draft", () => {
    const app = store({
      tasks: [{ id: 1, text: "A", done: false }] as Task[],
      filter: "all" as string,
      nextId: 2,
    })

    const toggle = (id: number) => {
      app.update(d => {
        const t = d.tasks.find(t => t.id === id)
        if (t) t.done = !t.done
      })
    }

    toggle(1)
    expect(app.tasks()[0].done).toBe(true)

    toggle(1)
    expect(app.tasks()[0].done).toBe(false)
  })

  test("removeTask filters out by id via draft", () => {
    const app = store({
      tasks: [
        { id: 1, text: "A", done: false },
        { id: 2, text: "B", done: false },
      ] as Task[],
      filter: "all" as string,
      nextId: 3,
    })

    const removeTask = (id: number) => {
      app.update(d => {
        d.tasks = d.tasks.filter(t => t.id !== id)
      })
    }

    removeTask(1)
    expect(app.tasks()).toHaveLength(1)
    expect(app.tasks()[0].text).toBe("B")
  })

  test("filtered computed returns correct subset per filter", () => {
    const app = store({
      tasks: [
        { id: 1, text: "A", done: false },
        { id: 2, text: "B", done: true },
        { id: 3, text: "C", done: false },
      ] as Task[],
      filter: "all" as string,
      nextId: 4,
    })

    const filtered = computed(() => {
      const tasks = app.tasks()
      const f = app.filter()
      if (f === "active") return tasks.filter(t => !t.done)
      if (f === "completed") return tasks.filter(t => t.done)
      return tasks
    })

    expect(filtered()).toHaveLength(3)

    app.filter("active")
    expect(filtered()).toHaveLength(2)

    app.filter("completed")
    expect(filtered()).toHaveLength(1)
    expect(filtered()[0].text).toBe("B")
  })

  test("stats computed tracks total, active, done", () => {
    const app = store({
      tasks: [
        { id: 1, text: "A", done: false },
        { id: 2, text: "B", done: true },
        { id: 3, text: "C", done: false },
      ] as Task[],
      filter: "all" as string,
      nextId: 4,
    })

    const stats = computed(() => {
      const tasks = app.tasks()
      return {
        total: tasks.length,
        active: tasks.filter(t => !t.done).length,
        done: tasks.filter(t => t.done).length,
      }
    })

    expect(stats()).toEqual({ total: 3, active: 2, done: 1 })

    app.update(d => { d.tasks.push({ id: 4, text: "D", done: true }) })
    expect(stats()).toEqual({ total: 4, active: 2, done: 2 })
  })

  test("saveEdit updates text or removes task if empty", () => {
    const app = store({
      tasks: [
        { id: 1, text: "Old", done: false },
        { id: 2, text: "Keep", done: false },
      ] as Task[],
      filter: "all" as string,
      nextId: 3,
    })
    const editingId = signal<number | null>(1)
    const editText = signal("")

    const saveEdit = () => {
      const id = editingId()
      if (id == null) return
      const text = editText().trim()
      if (!text) {
        app.update(d => { d.tasks = d.tasks.filter(t => t.id !== id) })
      } else {
        app.update(d => {
          const t = d.tasks.find(t => t.id === id)
          if (t) t.text = text
        })
      }
      editingId(null)
      editText("")
    }

    editText("New")
    saveEdit()
    expect(app.tasks()[0].text).toBe("New")
    expect(editingId()).toBe(null)

    editingId(2)
    editText("   ")
    saveEdit()
    expect(app.tasks()).toHaveLength(1)
  })

  test("clearDone removes all completed tasks", () => {
    const app = store({
      tasks: [
        { id: 1, text: "A", done: false },
        { id: 2, text: "B", done: true },
        { id: 3, text: "C", done: true },
      ] as Task[],
      filter: "all" as string,
      nextId: 4,
    })

    const clearDone = () => {
      app.update(d => { d.tasks = d.tasks.filter(t => !t.done) })
    }

    clearDone()
    expect(app.tasks()).toHaveLength(1)
    expect(app.tasks()[0].text).toBe("A")
  })

  test("effect updates document title from stats", () => {
    const app = store({
      tasks: [
        { id: 1, text: "A", done: false },
      ] as Task[],
      filter: "all" as string,
      nextId: 2,
    })

    const stats = computed(() => {
      const tasks = app.tasks()
      return {
        total: tasks.length,
        active: tasks.filter(t => !t.done).length,
        done: tasks.filter(t => t.done).length,
      }
    })

    effect(() => {
      const s = stats()
      document.title = s.active > 0 ? `Tasks (${s.active})` : "Tasks"
    })

    expect(document.title).toBe("Tasks (1)")

    app.update(d => { d.tasks[0].done = true })
    expect(document.title).toBe("Tasks")
  })
})
