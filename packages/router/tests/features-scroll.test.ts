import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test"
import { router, navigate } from "@hellajs/router/bundle"

describe("router", () => {
describe("scroll", () => {
  let container: HTMLDivElement
  let scrollSpy: ReturnType<typeof mock<() => void>>

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    window.history.pushState({}, "", "/")
    scrollSpy = mock(() => { })
    window.scrollTo = scrollSpy
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  const render = (content: string) => { container.textContent = content }

  test("scrollBehavior 'top' calls scrollTo with { top: 0, left: 0 }", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: 'top'
    })

    navigate("/about")
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 })
  })

  test("scrollBehavior 'preserve' does not call scrollTo", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: 'preserve'
    })

    navigate("/about")
    expect(scrollSpy).not.toHaveBeenCalled()
  })

  test("scrollBehavior 'auto' (default) does not call scrollTo", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      }
    })

    navigate("/about")
    expect(scrollSpy).not.toHaveBeenCalled()
  })

  test("custom scroll function receives to and from paths", () => {
    const customScroll = mock(() => ({ top: 100, left: 50 }))

    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: customScroll
    })

    navigate("/about")

    const [toPath, fromPath] = customScroll.mock.calls[0] as unknown as [string, string]
    expect(toPath).toBe("/about")
    expect(fromPath).not.toBe("/about")
    expect(scrollSpy).toHaveBeenCalledWith({ top: 100, left: 50 })
  })

  test("custom scroll function returning null skips scrollTo", () => {
    const customScroll = mock(() => null)

    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about")
      },
      scrollBehavior: customScroll
    })

    navigate("/about")
    expect(customScroll).toHaveBeenCalled()
    expect(scrollSpy).not.toHaveBeenCalled()
  })

  test("scroll happens on each navigation", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about"),
        "/contact": () => render("contact")
      },
      scrollBehavior: 'top'
    })

    navigate("/about")
    expect(scrollSpy).toHaveBeenCalledTimes(1)

    navigate("/contact")
    expect(scrollSpy).toHaveBeenCalledTimes(2)
  })

  test("scroll receives correct from path on subsequent navigations", () => {
    const customScroll = mock(() => ({ top: 0 }))

    router({
      routes: {
        "/": () => render("home"),
        "/about": () => render("about"),
        "/contact": () => render("contact")
      },
      scrollBehavior: customScroll
    })

    navigate("/about")

    navigate("/contact")
    const [secondTo, secondFrom] = customScroll.mock.calls[1]! as unknown as [string, string]

    expect(secondTo).toBe("/contact")
    expect(secondFrom).toBe("/about")
  })

  test("route-level scroll overrides global setting", () => {
    const globalScroll = mock(() => ({ top: 0 }))
    const routeScroll = mock(() => ({ top: 100 }))

    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          scroll: routeScroll,
          handler: () => render("about")
        }
      },
      scrollBehavior: globalScroll
    })

    navigate("/")
    expect(globalScroll).toHaveBeenCalled()
    globalScroll.mockClear()

    navigate("/about")
    expect(routeScroll).toHaveBeenCalled()
    expect(globalScroll).not.toHaveBeenCalled()
    expect(scrollSpy).toHaveBeenCalledWith({ top: 100 })
  })

  test("route-level scroll: false disables scrolling", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          scroll: false,
          handler: () => render("about")
        }
      },
      scrollBehavior: 'top'
    })

    navigate("/")
    expect(scrollSpy).toHaveBeenCalledTimes(1)
    scrollSpy.mockClear()

    navigate("/about")
    expect(scrollSpy).not.toHaveBeenCalled()
  })

  test("route-level scroll: 'top' overrides global 'preserve'", () => {
    router({
      routes: {
        "/": () => render("home"),
        "/about": {
          scroll: 'top',
          handler: () => render("about")
        }
      },
      scrollBehavior: 'preserve'
    })

    navigate("/")
    expect(scrollSpy).not.toHaveBeenCalled()

    navigate("/about")
    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0 })
  })
})
})
