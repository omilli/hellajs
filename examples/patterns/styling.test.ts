import { describe, test, expect, beforeEach } from "bun:test"
import { css, cssVars, cssReset, cssVarsReset, cssRemove } from "@hellajs/css/bundle"
import { store } from "@hellajs/store/bundle"

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>'
  cssReset()
  cssVarsReset()
})

describe("styling patterns", () => {
  test("scoped component styles generate unique class with nested selectors", () => {
    const card = css({
      padding: "1rem",
      borderRadius: "0.5rem",
      backgroundColor: "#fff",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      "h2": { margin: "0 0 0.5rem 0" },
      "&:hover": { boxShadow: "0 4px 12px rgba(0,0,0,0.15)" },
    })

    expect(card).toMatch(/^c\w+$/)

    flush()
    const content = document.getElementById("hella-css")?.textContent ?? ""
    expect(content).toContain("padding:1rem")
    expect(content).toContain("h2{margin:0 0 0.5rem 0}")
    expect(content).toContain(":hover{box-shadow:0 4px 12px rgba(0,0,0,0.15)}")
  })

  test("reactive CSS variables update with signal changes", () => {
    const theme = signal("light")
    const vars = cssVars({
      bg: () => theme() === "dark" ? "#1a1a1a" : "#ffffff",
      text: () => theme() === "dark" ? "#e0e0e0" : "#333333",
    })

    const box = css({
      background: vars.bg,
      color: vars.text,
      padding: "1rem",
      borderRadius: "0.5rem",
    })

    expect(box).toMatch(/^c\w+$/)

    flush()
    const cssContent = document.getElementById("hella-css")?.textContent ?? ""
    expect(cssContent).toContain("background:var(--bg)")
    expect(cssContent).toContain("color:var(--text)")

    const varsContent = document.getElementById("hella-vars")?.textContent ?? ""
    expect(varsContent).toContain("--bg: #ffffff")
    expect(varsContent).toContain("--text: #333333")

    theme("dark")
    flush()

    const varsAfter = document.getElementById("hella-vars")?.textContent ?? ""
    expect(varsAfter).toContain("--bg: #1a1a1a")
    expect(varsAfter).toContain("--text: #e0e0e0")
  })

  test("theme switching with store-backed cssVars", () => {
    const theme = store({
      primary: "#3b82f6",
      radius: "0.5rem",
      mode: "light",
    })

    const vars = cssVars({
      primary: () => theme.primary(),
      radius: () => theme.radius(),
      bg: () => theme.mode() === "dark" ? "#1a1a1a" : "#ffffff",
    })

    const btn = css({
      background: vars.primary,
      borderRadius: vars.radius,
      color: "#fff",
      border: "none",
      padding: "0.5rem 1rem",
      cursor: "pointer",
    })

    expect(btn).toMatch(/^c\w+$/)

    flush()
    const varsContent = document.getElementById("hella-vars")?.textContent ?? ""
    expect(varsContent).toContain("--primary: #3b82f6")
    expect(varsContent).toContain("--radius: 0.5rem")
    expect(varsContent).toContain("--bg: #ffffff")

    theme.mode("dark")
    flush()

    const varsAfter = document.getElementById("hella-vars")?.textContent ?? ""
    expect(varsAfter).toContain("--bg: #1a1a1a")
  })

  test("responsive styles with media queries", () => {
    const grid = css({
      display: "grid",
      gridTemplateColumns: "1fr",
      gap: "1rem",
      "@media (min-width: 768px)": {
        gridTemplateColumns: "1fr 1fr",
      },
      "@media (min-width: 1024px)": {
        gridTemplateColumns: "1fr 1fr 1fr",
      },
    })

    expect(grid).toMatch(/^c\w+$/)

    flush()
    const content = document.getElementById("hella-css")?.textContent ?? ""
    expect(content).toContain("@media (min-width: 768px)")
    expect(content).toContain("grid-template-columns:1fr 1fr")
    expect(content).toContain("@media (min-width: 1024px)")
    expect(content).toContain("grid-template-columns:1fr 1fr 1fr")
  })

  test("keyframe animations with global: true", () => {
    css({
      "@keyframes spin": {
        from: { transform: "rotate(0deg)" },
        to: { transform: "rotate(360deg)" },
      },
    }, { global: true })

    const spinner = css({
      width: "2rem",
      height: "2rem",
      border: "3px solid #e5e7eb",
      borderTopColor: "#3b82f6",
      borderRadius: "50%",
      animation: "spin 0.8s linear infinite",
    })

    expect(spinner).toMatch(/^c\w+$/)

    flush()
    const content = document.getElementById("hella-css")?.textContent ?? ""
    expect(content).toContain("@keyframes spin")
    expect(content).toContain("from{transform:rotate(0deg)}")
    expect(content).toContain("to{transform:rotate(360deg)}")
    expect(content).toContain("animation:spin 0.8s linear infinite")
  })

  test("style cleanup with cssRemove decrements reference count", () => {
    const styles = { color: "red" }
    css(styles)

    flush()
    expect(document.getElementById("hella-css")?.textContent).toContain("color:red")

    cssRemove(styles)
    flush()
    expect(document.getElementById("hella-css")?.textContent).not.toContain("color:red")
  })
})
