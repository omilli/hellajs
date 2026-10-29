import { describe, test, expect, beforeEach } from "vite-plus/test";
import { delay, resetTestState } from "@utils/test-helpers.js";
import { hydrate } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";
import * as ssrEntry from "../dist/ssr/index.js";
import * as domEntry from "../dist/index.js";

beforeEach(() => {
  resetTestState();
});

describe("ssr entry", () => {
  test("renders a part through ssr() to the trigger's exact server markup", () => {
    const parts = ssrEntry.popover();
    const html = ssr(parts.Trigger({ children: "Toggle" }));
    const contentId = html.match(/aria-controls="([^"]+)"/)?.[1];
    expect(html).toBe(
      `<button type="button" data-slot="popover-trigger" data-state="closed" aria-expanded="false" aria-haspopup="dialog" aria-controls="${contentId}">Toggle</button>`,
    );
    expect(ssr(parts.Content({ children: "Body" }))).toBe("<!--[--><!--]-->");
  });

  test("ssr markup hydrates through the dom-target dist and flips state interactively", async () => {
    const server = ssrEntry.popover();
    const container = document.createElement("div");
    document.body.append(container);
    container.innerHTML = ssr(server.Trigger({ children: "Toggle" }));
    const serverTrigger = container.firstElementChild as HTMLElement;

    const client = domEntry.popover();
    hydrate(() => client.Trigger({ children: "Toggle" }), container);
    expect(container.firstElementChild).toBe(serverTrigger);

    serverTrigger.dispatchEvent(new Event("click"));
    await delay(0);
    expect(serverTrigger.getAttribute("data-state")).toBe("open");
    expect(serverTrigger.getAttribute("aria-expanded")).toBe("true");
  });
});
