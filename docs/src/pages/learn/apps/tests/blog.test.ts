import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { router, navigate, route } from "@hellajs/router/bundle"
import { resource, resourceCache } from "@hellajs/resource/bundle"

interface Post {
  id: string
  title: string
  category: string
  body: string
}

const POSTS: Post[] = [
  { id: "1", title: "Reactive Primitives", category: "core", body: "Signals are the foundation..." },
  { id: "2", title: "Computed Values", category: "core", body: "Derived state updates automatically..." },
  { id: "3", title: "Surgical DOM Updates", category: "dom", body: "No virtual DOM diffing required..." },
  { id: "4", title: "Keyed List Reconciliation", category: "dom", body: "The LIS algorithm minimizes moves..." },
  { id: "5", title: "Nested Routing", category: "router", body: "Routes mirror your app structure..." },
]

beforeEach(() => {
  resourceCache.map.clear()
  document.body.innerHTML = '<div id="app"></div>'
  window.history.replaceState({}, "", "/")
})

afterEach(() => {
  resourceCache.map.clear()
})

describe("blog app", () => {
  test("resource fetches all posts", async () => {
    const postsResource = resource(
      () => delay([...POSTS]),
      { cacheTime: 30000 },
    )

    postsResource.fetch({ force: true })
    expect(postsResource.isLoading()).toBe(true)

    await delay(30)
    expect(postsResource.data()).toHaveLength(5)
    expect(postsResource.data()![0].title).toBe("Reactive Primitives")
  })

  test("resource with key fetches posts by category", async () => {
    const category = signal("core")

    const categoryResource = resource(
      (cat: string) => delay(POSTS.filter(p => p.category === cat)),
      { key: () => category(), refetchOnKeyChange: true },
    )

    categoryResource.fetch({ force: true })
    await delay(30)
    expect(categoryResource.data()).toHaveLength(2)

    category("dom")
    categoryResource.invalidate()
    await delay(30)
    expect(categoryResource.data()).toHaveLength(2)
    expect(categoryResource.data()![0].category).toBe("dom")
  })

  test("resource with key fetches single post by id", async () => {
    const postId = signal("1")

    const postResource = resource(
      (id: string) => delay(POSTS.find(p => p.id === id) || null),
      { key: () => postId(), refetchOnKeyChange: true },
    )

    postResource.fetch({ force: true })
    await delay(30)
    expect(postResource.data()?.title).toBe("Reactive Primitives")

    postId("3")
    postResource.invalidate()
    await delay(30)
    expect(postResource.data()?.title).toBe("Surgical DOM Updates")
  })

  test("nested routes render parent layout and child views", () => {
    const currentView = signal<string | null>(null)

    router({
      routes: {
        "/blog": {
          handler: () => currentView("blog-layout"),
          children: {
            "/:category": {
              handler: () => currentView(`category-${route().params.category}`),
              children: {
                "/:postId": (params: { category: string; postId: string }) => {
                  currentView(`post-${params.postId}`)
                },
              },
            },
          },
        },
      },
      notFound: () => navigate("/blog"),
    })

    navigate("/blog")
    expect(currentView()).toBe("blog-layout")

    navigate("/blog/core")
    expect(currentView()).toBe("category-core")

    navigate("/blog/core/1")
    expect(currentView()).toBe("post-1")
  })

  test("lazy component loading resolves after delay", async () => {
    const PostDetail = (props: { category: string }) => `detail-${props.category}`

    const loadPostDetail = () => delay(10).then(() => PostDetail)

    const result = await loadPostDetail()
    expect(result({ category: "core" })).toBe("detail-core")
  })
})
