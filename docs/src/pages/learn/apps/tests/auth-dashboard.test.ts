import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { router, navigate, route } from "@hellajs/router/bundle"
import { resource, resourceCache } from "@hellajs/resource/bundle"

beforeEach(() => {
  resourceCache.map.clear()
  document.body.innerHTML = '<div id="app"></div>'
  window.history.replaceState({}, "", "/")
})

afterEach(() => {
  resourceCache.map.clear()
})

describe("auth-dashboard app", () => {
  test("isLoggedIn computed reflects user signal state", () => {
    const user = signal<{ name: string; role: string } | null>(null)
    const isLoggedIn = computed(() => !!user())

    expect(isLoggedIn()).toBe(false)

    user({ name: "Admin", role: "admin" })
    expect(isLoggedIn()).toBe(true)

    user(null)
    expect(isLoggedIn()).toBe(false)
  })

  test("login validation rejects empty fields and wrong credentials", () => {
    const user = signal<{ name: string; role: string } | null>(null)
    const username = signal("")
    const password = signal("")
    const error = signal("")

    const mockUsers: Record<string, { name: string; role: string }> = {
      admin: { name: "Admin", role: "admin" },
      demo: { name: "Demo User", role: "viewer" },
    }

    const handleSubmit = () => {
      const u = username().trim()
      const p = password().trim()
      if (!u || !p) { error("Both fields are required"); return }
      const found = mockUsers[u]
      if (!found || p !== "password") { error("Invalid credentials"); return }
      user(found)
    }

    handleSubmit()
    expect(error()).toBe("Both fields are required")

    username("admin")
    password("wrong")
    handleSubmit()
    expect(error()).toBe("Invalid credentials")
    expect(user()).toBe(null)

    username("admin")
    password("password")
    handleSubmit()
    expect(user()).toEqual({ name: "Admin", role: "admin" })
  })

  test("auth guard redirects unauthenticated users to login", () => {
    const user = signal<string | null>(null)
    let guardRedirected = false
    let currentView!: string

    router({
      routes: {
        "/login": () => { currentView = "login" },
        "/dashboard": {
          before: () => { if (!user()) { guardRedirected = true; navigate("/login") } },
          handler: () => { if (!user()) return; currentView = `dashboard-${user()}` },
        },
      },
    })

    navigate("/dashboard")
    expect(guardRedirected).toBe(true)
    expect(currentView).toBe("login")

    user("alice")
    navigate("/dashboard")
    expect(currentView).toBe("dashboard-alice")
  })

  test("resource fetches dashboard data with loading state", async () => {
    const dashboardResource = resource(
      () => delay([
        { id: 1, title: "Q4 Revenue", value: "$1.2M", trend: "up" },
        { id: 2, title: "Active Users", value: "8,421", trend: "up" },
      ]),
    )

    dashboardResource.fetch({ force: true })
    expect(dashboardResource.isLoading()).toBe(true)

    await delay(30)
    expect(dashboardResource.data()).toEqual([
      { id: 1, title: "Q4 Revenue", value: "$1.2M", trend: "up" },
      { id: 2, title: "Active Users", value: "8,421", trend: "up" },
    ])
    expect(dashboardResource.status()).toBe("success")
  })

  test("logout clears user and resets resource", async () => {
    const user = signal<{ name: string } | null>({ name: "Admin" })
    const dashboardResource = resource(
      () => delay({ data: "metrics" }),
    )

    dashboardResource.fetch({ force: true })
    await delay(30)
    expect(dashboardResource.data()).toEqual({ data: "metrics" })

    const logout = () => {
      user(null)
      dashboardResource.reset()
    }

    logout()
    expect(user()).toBe(null)
    expect(dashboardResource.data()).toBe(undefined)
  })

  test("effect updates document title from route path", () => {
    let currentPath = "/"

    router({
      routes: {
        "/login": () => { currentPath = "/login" },
        "/dashboard": () => { currentPath = "/dashboard" },
      },
    })

    effect(() => {
      const path = route().path.split("?")[0]
      const titles: Record<string, string> = { "/login": "Sign In", "/dashboard": "Dashboard" }
      document.title = `${titles[path] || "Auth Dashboard"} | HellaJS`
    })

    navigate("/login")
    expect(document.title).toBe("Sign In | HellaJS")

    navigate("/dashboard")
    expect(document.title).toBe("Dashboard | HellaJS")
  })
})
