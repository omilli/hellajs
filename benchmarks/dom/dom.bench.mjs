
import { writeFileSync, unlinkSync } from "fs";
import { chromium } from "playwright";
import { Suite } from "benchmark";

const html = `
<!DOCTYPE html>
<html>
<head>
</head>
<body>
  <div id="app"></div>
  <script src="packages/core/dist/core.browser.js"></script>
  <script src="packages/dom/dist/dom.browser.js"></script>
  <script>
    // Helper function for waiting multiple animation frames
    window.waitForFrames = (frameCount = 2) => {
      return new Promise(resolve => {
        let count = 0;
        const waitFrame = () => {
          requestAnimationFrame(() => {
            count++;
            if (count >= frameCount) resolve();
            else waitFrame();
          });
        };
        waitFrame();
      });
    };

    // Performance measurement helpers
    window.benchmarks = {
      // Basic mount test
      mountBasic: () => {
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: ["hello world!"]
        }, "#app");
      },

      // Mount with reactive content
      mountReactive: () => {
        const count = hellajs.core.signal(0);
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: [() => "Count: " + count()]
        }, "#app");
        count(42); // Trigger update
      },

      // Mount with events
      mountWithEvents: () => {
        const count = hellajs.core.signal(0);
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: [{
            tag: "button",
            props: {
              onClick: () => count(count() + 1)
            },
            children: [() => "Count: " + count()]
          }]
        }, "#app");
      },

      // Mount nested components
      mountNested: () => {
        hellajs.dom.mount({
          tag: "div",
          props: { class: "container" },
          children: [
            {
              tag: "h1",
              props: {},
              children: ["Nested Components"]
            },
            {
              tag: "div",
              props: { class: "content" },
              children: [
                {
                  tag: "p",
                  props: {},
                  children: ["This is nested content"]
                },
                {
                  tag: "span",
                  props: { style: "color: blue;" },
                  children: ["Styled span"]
                }
              ]
            }
          ]
        }, "#app");
      },

      // Mount with fragments
      mountFragment: () => {
        hellajs.dom.mount({
          tag: "$",
          props: {},
          children: [
            {
              tag: "h1",
              props: {},
              children: ["Fragment Test"]
            },
            {
              tag: "p",
              props: {},
              children: ["Fragment content 1"]
            },
            {
              tag: "p",
              props: {},
              children: ["Fragment content 2"]
            }
          ]
        }, "#app");
      },

      // Mount with lifecycle hooks
      mountWithLifecycle: () => {
        let updateCount = 0;
        hellajs.dom.mount({
          tag: "div",
          props: {
            id: "test", 
            onUpdate: () => { updateCount++; console.log("Updated: " + updateCount); },
            onDestroy: () => { console.log("Component destroyed"); }
          },
          children: ["Lifecycle test"]
        }, "#app");
        document.getElementById("test").remove();
      },

      // Basic forEach test
      forEachBasic: () => {
        const items = ["apple", "banana", "cherry"];
        hellajs.dom.mount({
          tag: "ul",
          props: {},
          children: [
            hellajs.dom.forEach(items, (item, index) => ({
              tag: "li",
              props: { key: index },
              children: [item]
            }))
          ]
        }, "#app");
      },

      // forEach with reactive data
      forEachReactive: () => {
        const items = hellajs.core.signal(["apple", "banana", "cherry"]);
        hellajs.dom.mount({
          tag: "ul",
          props: {},
          children: [
            hellajs.dom.forEach(items, (item, index) => ({
              tag: "li",
              props: { key: index },
              children: [item]
            }))
          ]
        }, "#app");
        // Trigger updates
        items(["apple", "banana", "cherry", "date"]);
        items(["banana", "cherry", "elderberry"]);
      },

      // forEach with objects and keys
      forEachWithKeys: () => {
        const users = hellajs.core.signal([
          { id: 1, name: "Alice", age: 25 },
          { id: 2, name: "Bob", age: 30 },
          { id: 3, name: "Charlie", age: 35 }
        ]);
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: [
            hellajs.dom.forEach(users, (user) => ({
              tag: "div",
              props: { 
                key: user.id,
                class: "user-card",
                style: "border: 1px solid #ccc; margin: 5px; padding: 10px;"
              },
              children: [
                {
                  tag: "h3",
                  props: {},
                  children: [user.name]
                },
                {
                  tag: "p",
                  props: {},
                  children: ["Age: " + user.age]
                }
              ]
            }))
          ]
        }, "#app");
        // Test reordering
        users([
          { id: 3, name: "Charlie", age: 36 },
          { id: 1, name: "Alice", age: 26 },
          { id: 4, name: "David", age: 28 }
        ]);
      },

      // forEach with complex updates
      forEachComplex: () => {
        const tasks = hellajs.core.signal([
          { id: 1, text: "Task 1", completed: false },
          { id: 2, text: "Task 2", completed: true },
          { id: 3, text: "Task 3", completed: false }
        ]);
        
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: [
            {
              tag: "h2",
              props: {},
              children: ["Task List"]
            },
            hellajs.dom.forEach(tasks, (task) => ({
              tag: "div",
              props: { 
                key: task.id,
                class: "task " + (task.completed ? "completed" : "pending"),
                style: task.completed ? "opacity: 0.6; text-decoration: line-through;" : ""
              },
              children: [
                {
                  tag: "input",
                  props: {
                    type: "checkbox",
                    checked: task.completed,
                    onChange: () => {
                      const updated = tasks().map(t => 
                        t.id === task.id ? { ...t, completed: !t.completed } : t
                      );
                      tasks(updated);
                    }
                  },
                  children: []
                },
                {
                  tag: "span",
                  props: { style: "margin-left: 8px;" },
                  children: [task.text]
                }
              ]
            }))
          ]
        }, "#app");
        
        // Simulate interactions
        setTimeout(() => {
          tasks([
            { id: 1, text: "Task 1", completed: true },
            { id: 2, text: "Task 2", completed: true },
            { id: 3, text: "Task 3", completed: false },
            { id: 4, text: "Task 4", completed: false }
          ]);
        }, 100);
      },

      // forEach empty array handling
      forEachEmpty: () => {
        const items = hellajs.core.signal([]);
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: [
            {
              tag: "p",
              props: {},
              children: ["Items:"]
            },
            hellajs.dom.forEach(items, (item, index) => ({
              tag: "span",
              props: { key: index },
              children: [item]
            })),
            {
              tag: "p",
              props: {},
              children: ["(Empty list handled)"]
            }
          ]
        }, "#app");
        // Test transition from empty to filled
        setTimeout(() => items(["item1", "item2"]), 50);
        setTimeout(() => items([]), 100);
      },

      // Combined mount and forEach stress test
      mountForEachCombined: () => {
        const categories = hellajs.core.signal([
          { id: 1, name: "Fruits", items: ["apple", "banana"] },
          { id: 2, name: "Vegetables", items: ["carrot", "broccoli"] }
        ]);
        
        hellajs.dom.mount({
          tag: "div",
          props: { class: "categories" },
          children: [
            hellajs.dom.forEach(categories, (category) => ({
              tag: "div",
              props: { 
                key: category.id,
                class: "category",
                style: "border: 2px solid #333; margin: 10px; padding: 15px;"
              },
              children: [
                {
                  tag: "h3",
                  props: {},
                  children: [category.name]
                },
                {
                  tag: "ul",
                  props: {},
                  children: [
                    hellajs.dom.forEach(category.items, (item, index) => ({
                      tag: "li",
                      props: { key: category.id + "-" + index },
                      children: [item]
                    }))
                  ]
                }
              ]
            }))
          ]
        }, "#app");
        
        // Complex update
        setTimeout(() => {
          categories([
            { id: 1, name: "Fruits", items: ["apple", "banana", "orange"] },
            { id: 3, name: "Grains", items: ["rice", "wheat"] },
            { id: 2, name: "Vegetables", items: ["carrot"] }
          ]);
        }, 100);
      }
    };
  </script>
</body>
</html>
`;

const fileName = "tmp.dom-test.html";

writeFileSync(fileName, html);

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-web-security', '--disable-dev-shm-usage']
  });
  const page = await browser.newPage();
  await page.goto(`file://${process.cwd()}/${fileName}`);

  const suite = new Suite("DOM Operations");

  // Mount API Tests
  suite.add("mount - basic", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.mountBasic());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("mount - reactive content", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.mountReactive());
      await page.evaluate(() => waitForFrames(3));
      deferred.resolve();
    },
  });

  suite.add("mount - with events", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.mountWithEvents());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("mount - nested components", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.mountNested());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("mount - fragment", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.mountFragment());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("mount - with lifecycle", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.mountWithLifecycle());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  // forEach API Tests
  suite.add("forEach - basic", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.forEachBasic());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("forEach - reactive data", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.forEachReactive());
      await page.evaluate(() => waitForFrames(6));
      deferred.resolve();
    },
  });

  suite.add("forEach - with keys", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.forEachWithKeys());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("forEach - complex updates", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.forEachComplex());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  suite.add("forEach - empty array", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.forEachEmpty());
      await page.evaluate(() => waitForFrames(2));
      deferred.resolve();
    },
  });

  // Combined Tests
  suite.add("mount + forEach combined", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => benchmarks.mountForEachCombined());
      await page.evaluate(() => waitForFrames(8));
      deferred.resolve();
    },
  });

  suite
    .on("cycle", (event) => console.log(String(event.target)))
    .on("complete", async function () {
      await browser.close();
      unlinkSync(fileName);
    })
    .run({ async: true });
})();
