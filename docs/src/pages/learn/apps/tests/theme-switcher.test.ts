import { describe, test, expect, beforeEach } from "bun:test"
import { store } from "@hellajs/store/bundle"
import { css, cssVars, cssReset, cssVarsReset } from "@hellajs/css/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  cssReset()
  cssVarsReset()
})

describe("theme-switcher app", () => {
  test("store initializes with defaults when no saved theme", () => {
    const theme = store({
      mode: "light",
      primary: "#3b82f6",
      radius: "0.5rem",
      font: "system-ui",
    })

    expect(theme.mode()).toBe("light")
    expect(theme.primary()).toBe("#3b82f6")
    expect(theme.radius()).toBe("0.5rem")
    expect(theme.font()).toBe("system-ui")
  })

  test("cssVars react to theme store changes", () => {
    const theme = store({
      mode: "light",
      primary: "#3b82f6",
      radius: "0.5rem",
      font: "system-ui",
    })

    const vars = cssVars({
      bg: () => theme.mode() === "dark" ? "#1a1a2e" : "#ffffff",
      text: () => theme.mode() === "dark" ? "#e2e8f0" : "#1e293b",
      primary: () => theme.primary(),
      radius: () => theme.radius(),
    })

    flush()
    const varsContent = document.getElementById("hella-vars")?.textContent ?? ""
    expect(varsContent).toContain("--bg: #ffffff")
    expect(varsContent).toContain("--text: #1e293b")
    expect(varsContent).toContain("--primary: #3b82f6")

    theme.mode("dark")
    flush()
    const varsAfter = document.getElementById("hella-vars")?.textContent ?? ""
    expect(varsAfter).toContain("--bg: #1a1a2e")
    expect(varsAfter).toContain("--text: #e2e8f0")
  })

  test("isDark computed toggles correctly", () => {
    const theme = store({ mode: "light" })
    const isDark = computed(() => theme.mode() === "dark")

    expect(isDark()).toBe(false)

    theme.mode("dark")
    expect(isDark()).toBe(true)
  })

  test("toggleMode flips between light and dark", () => {
    const theme = store({ mode: "light" as string })
    const isDark = computed(() => theme.mode() === "dark")

    const toggleMode = () => theme.mode(isDark() ? "light" : "dark")

    toggleMode()
    expect(theme.mode()).toBe("dark")

    toggleMode()
    expect(theme.mode()).toBe("light")
  })

  test("setPrimary changes the accent color", () => {
    const theme = store({ primary: "#3b82f6" })
    const setPrimary = (color: string) => theme.primary(color)

    setPrimary("#22c55e")
    expect(theme.primary()).toBe("#22c55e")
  })

  test("setRadius and setFont update store properties", () => {
    const theme = store({ radius: "0.5rem", font: "system-ui" })

    theme.radius("1rem")
    expect(theme.radius()).toBe("1rem")

    theme.font("Georgia")
    expect(theme.font()).toBe("Georgia")
  })

  test("css classes reference reactive variables", () => {
    const theme = store({
      mode: "light",
      primary: "#3b82f6",
      radius: "0.5rem",
    })

    const vars = cssVars({
      bg: () => theme.mode() === "dark" ? "#1a1a2e" : "#ffffff",
      primary: () => theme.primary(),
      radius: () => theme.radius(),
    })

    const btn = css({
      backgroundColor: vars.primary,
      borderRadius: vars.radius,
      color: "#fff",
    })

    expect(btn).toMatch(/^c\w+$/)

    flush()
    const content = document.getElementById("hella-css")?.textContent ?? ""
    expect(content).toContain("background-color:var(--primary)")
    expect(content).toContain("border-radius:var(--radius)")
  })

  test("effect persists theme state to localStorage", () => {
    const theme = store({
      mode: "light",
      primary: "#3b82f6",
      radius: "0.5rem",
      font: "system-ui",
    })

    effect(() => {
      localStorage.setItem("theme", JSON.stringify({
        mode: theme.mode(),
        primary: theme.primary(),
        radius: theme.radius(),
        font: theme.font(),
      }))
    })

    theme.mode("dark")
    theme.primary("#22c55e")

    const saved = JSON.parse(localStorage.getItem("theme")!)
    expect(saved.mode).toBe("dark")
    expect(saved.primary).toBe("#22c55e")
  })
})
