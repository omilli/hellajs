import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { router, navigate, route } from "@hellajs/router/bundle"

describe("routing patterns", () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    window.history.replaceState({}, "", "/")
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  const render = (content: string) => { container.textContent = content }

  test("basic route setup maps URL patterns to handlers", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about"),
        "/users/:id": (params: { id: string }) => render(`user-${params.id}`),
      },
      notFound: () => render("not-found"),
    })

    navigate("/")
    expect(container.textContent).toBe("home")

    navigate("/about")
    expect(container.textContent).toBe("about")

    navigate("/users/42")
    expect(container.textContent).toBe("user-42")
  })

  test("auth guard redirects unauthenticated users", () => {
    const user = signal<string | null>(null)
    let guardRedirected = false

    router({
      routes: {
        "/login": () => render("login"),
        "/dashboard": {
          before: () => { if (!user()) { guardRedirected = true; navigate("/login") } },
          handler: () => {
            if (!user()) return
            render(`dashboard-${user()}`)
          },
        },
      },
    })

    navigate("/dashboard")
    expect(guardRedirected).toBe(true)
    expect(container.textContent).toBe("login")

    user("alice")
    navigate("/dashboard")
    expect(container.textContent).toBe("dashboard-alice")
  })

  test("nested routes with parameter inheritance", () => {
    router({
      routes: {
        "/dashboard": {
          handler: () => render("dashboard-layout"),
          children: {
            "/overview": () => render("overview"),
            "/users/:id": (params: { id: string }) => render(`user-detail-${params.id}`),
          },
        },
      },
    })

    navigate("/dashboard")
    expect(container.textContent).toBe("dashboard-layout")

    navigate("/dashboard/overview")
    expect(container.textContent).toBe("overview")

    navigate("/dashboard/users/42")
    expect(container.textContent).toBe("user-detail-42")
  })

  test("query parameters parsed and passed to handlers", () => {
    router({
      routes: {
        "/search": (_params: unknown, query: { q: string; sort: string }) => {
          render(`search-${query?.q}-${query?.sort}`)
        },
      },
    })

    navigate("/search", { query: { q: "hello", sort: "date" } })
    expect(container.textContent).toBe("search-hello-date")
    expect(route().query.q).toBe("hello")
    expect(route().query.sort).toBe("date")
  })

  test("redirect patterns resolve string routes and redirects array", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/home": "/",
        "/old-about": "/about",
        "/about": () => render("about"),
      },
      redirects: [
        { from: ["/tasks", "/items"], to: "/todos" },
      ],
    })

    navigate("/")
    expect(container.textContent).toBe("home")

    navigate("/home")
    expect(route().path).toBe("/")
    expect(container.textContent).toBe("home")

    navigate("/old-about")
    expect(route().path).toBe("/about")
    expect(container.textContent).toBe("about")
  })

  test("scroll behavior configuration at global, route, and inline levels", () => {
    router({
      scrollBehavior: "top",
      routes: {
        "/feed": {
          scroll: "preserve",
          handler: () => render("feed"),
        },
        "/chat": {
          scroll: false,
          handler: () => render("chat"),
        },
        "/docs/*": {
          scroll: () => ({ top: 80 }),
          handler: () => render("docs"),
        },
      },
    })

    navigate("/feed")
    expect(container.textContent).toBe("feed")
    expect(route().path).toBe("/feed")

    navigate("/chat")
    expect(container.textContent).toBe("chat")

    navigate("/docs/intro")
    expect(container.textContent).toBe("docs")

    navigate("/feed", { scroll: "top" })
    expect(container.textContent).toBe("feed")
  })
})
