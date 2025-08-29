
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
    window.benchmarks = {
      mount: () => {
        const count = hellajs.core.signal(0)
        hellajs.dom.mount({
          tag: "div",
          props: {},
          children: ["hello world!"]
        }, "#app");
      },
    };
  </script>
</body>
</html>
`;

const fileName = "tmp.dom-test.html";

writeFileSync(fileName, html);

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(`file://${process.cwd()}/${fileName}`);

  const suite = new Suite("DOM Operations");

  suite.add("mount", {
    defer: true,
    fn: async (deferred) => {
      await page.evaluate(() => {
        window.benchmarks.mount();
      });
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
