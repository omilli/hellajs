import { describe, test, expect, beforeEach } from "bun:test";
import { signal } from "../../packages/core/dist/core.js";
import { forEach, mount, registerDOMTemplate, bindDOMTemplate, createTemplateFromVNode } from "../../packages/dom/dist/dom.js";
import { tick } from "../utils/tick.js";

beforeEach(() => {
  document.body.innerHTML = '<div id="app"></div>';
});

describe("DOM Template Caching", () => {
  test("should register and bind DOM templates", () => {
    // Register a DOM template
    registerDOMTemplate("simple-card", () => {
      const element = document.createElement("div");
      element.className = "card";
      
      const title = document.createElement("h3");
      element.appendChild(title);
      
      const content = document.createElement("p");
      element.appendChild(content);
      
      return {
        element,
        bindings: [
          {
            type: 'text',
            path: [0], // First child (h3)
            accessor: (ctx) => ctx.title
          },
          {
            type: 'text',
            path: [1], // Second child (p)
            accessor: (ctx) => ctx.content
          }
        ],
        paramNames: ['title', 'content']
      };
    });

    // Bind the template with context
    const boundElement = bindDOMTemplate("simple-card", {
      title: "Test Title",
      content: "Test content"
    });

    expect(boundElement).toBeTruthy();
    expect(boundElement.tagName.toLowerCase()).toBe("div");
    expect(boundElement.className).toBe("card");
    expect(boundElement.children.length).toBe(2);
    expect(boundElement.children[0].textContent).toBe("Test Title");
    expect(boundElement.children[1].textContent).toBe("Test content");
  });

  test("should return null for non-existent templates", () => {
    const result = bindDOMTemplate("non-existent", {});
    expect(result).toBe(null);
  });

  test("should create templates from VNode structures", () => {
    const vnode = {
      tag: "div",
      props: { class: "user-card" },
      children: [
        { tag: "h3", children: ["User Name"] },
        { tag: "p", children: ["User Details"] }
      ]
    };

    const result = createTemplateFromVNode(vnode, ["user"]);
    
    expect(result.element).toBeTruthy();
    expect(result.bindings).toBeTruthy();
    expect(Array.isArray(result.bindings)).toBe(true);
    expect(result.element.tagName.toLowerCase()).toBe("div");
  });

  test("should work with forEach using DOM templates", async () => {
    // Register a user card template
    registerDOMTemplate("user-item", () => {
      const element = document.createElement("div");
      element.className = "user-item";
      element.setAttribute("data-testid", "user-card");
      
      const name = document.createElement("span");
      name.className = "name";
      element.appendChild(name);
      
      const age = document.createElement("span");
      age.className = "age";
      element.appendChild(age);
      
      return {
        element,
        bindings: [
          {
            type: 'attribute',
            path: [], // Root element
            name: 'data-user-id',
            accessor: (ctx) => ctx.user.id
          },
          {
            type: 'text',
            path: [0], // First child (name span)
            accessor: (ctx) => ctx.user.name
          },
          {
            type: 'text',
            path: [1], // Second child (age span) 
            accessor: (ctx) => ctx.user.age
          }
        ],
        paramNames: ['user']
      };
    });

    const users = signal([
      { id: 1, name: "Alice", age: 30 },
      { id: 2, name: "Bob", age: 25 }
    ]);

    const vnode = {
      tag: "div",
      props: { id: "user-list" },
      children: [
        forEach(
          users,
          // Fallback function (should not be used when template exists)
          (user) => ({ tag: "div", children: [`Fallback: ${user.name}`] }),
          "user-item", // Template ID
          ["user"] // Parameter names
        )
      ]
    };

    mount(vnode);

    // Should use DOM template, not fallback
    expect(document.querySelectorAll(".user-item").length).toBe(2);
    expect(document.querySelector("[data-user-id='1']")).toBeTruthy();
    expect(document.querySelector(".name").textContent).toBe("Alice");
    expect(document.querySelector(".age").textContent).toBe("30");
    
    // Should not show fallback content
    expect(document.body.textContent).not.toContain("Fallback:");

    // Update users and verify DOM template still works
    users([
      { id: 3, name: "Carol", age: 35 },
      { id: 4, name: "Dave", age: 40 },
      { id: 5, name: "Eve", age: 28 }
    ]);
    
    await tick();

    expect(document.querySelectorAll(".user-item").length).toBe(3);
    expect(document.querySelector("[data-user-id='3']")).toBeTruthy();
    expect(document.querySelectorAll(".name")[0].textContent).toBe("Carol");
    expect(document.querySelectorAll(".age")[2].textContent).toBe("28");
  });

  test("should handle complex template bindings", () => {
    registerDOMTemplate("product-card", () => {
      const card = document.createElement("div");
      card.className = "product-card";
      
      const header = document.createElement("header");
      const title = document.createElement("h2");
      const price = document.createElement("span");
      price.className = "price";
      
      header.appendChild(title);
      header.appendChild(price);
      card.appendChild(header);
      
      const description = document.createElement("p");
      description.className = "description";
      card.appendChild(description);
      
      return {
        element: card,
        bindings: [
          {
            type: 'attribute',
            path: [], // Root element
            name: 'data-product-id',
            accessor: (ctx) => ctx.product.id
          },
          {
            type: 'text',
            path: [0, 0], // header -> h2
            accessor: (ctx) => ctx.product.name
          },
          {
            type: 'text', 
            path: [0, 1], // header -> price span
            accessor: (ctx) => `$${ctx.product.price}`
          },
          {
            type: 'text',
            path: [1], // description p
            accessor: (ctx) => ctx.product.description
          },
          {
            type: 'attribute',
            path: [0, 1], // price span
            name: 'data-price',
            accessor: (ctx) => ctx.product.price
          }
        ],
        paramNames: ['product']
      };
    });

    const product = {
      id: "p1",
      name: "Laptop",
      price: 999.99,
      description: "High-performance laptop"
    };

    const boundElement = bindDOMTemplate("product-card", { product });
    
    expect(boundElement.getAttribute("data-product-id")).toBe("p1");
    expect(boundElement.querySelector("h2").textContent).toBe("Laptop");
    expect(boundElement.querySelector(".price").textContent).toBe("$999.99");
    expect(boundElement.querySelector(".price").getAttribute("data-price")).toBe("999.99");
    expect(boundElement.querySelector(".description").textContent).toBe("High-performance laptop");
  });

  test("should efficiently clone templates multiple times", () => {
    registerDOMTemplate("simple-item", () => {
      const element = document.createElement("div");
      element.className = "item";
      const text = document.createElement("span");
      element.appendChild(text);
      
      return {
        element,
        bindings: [
          {
            type: 'text',
            path: [0],
            accessor: (ctx) => ctx.value
          }
        ],
        paramNames: ['value']
      };
    });

    // Create multiple instances
    const instances = [];
    for (let i = 0; i < 100; i++) {
      const instance = bindDOMTemplate("simple-item", { value: `Item ${i}` });
      instances.push(instance);
    }

    expect(instances.length).toBe(100);
    expect(instances[0].className).toBe("item");
    expect(instances[0].children[0].textContent).toBe("Item 0");
    expect(instances[99].children[0].textContent).toBe("Item 99");
    
    // Verify each instance is independent
    instances[0].children[0].textContent = "Modified";
    expect(instances[1].children[0].textContent).toBe("Item 1"); // Should not be affected
  });
});