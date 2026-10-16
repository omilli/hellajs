import { describe, test, expect, beforeEach, vi } from "vite-plus/test";
import { scope } from "@hellajs/core";
import { resetTestState } from "@utils/test-helpers.js";
import { mount, onError, peekState } from "@hellajs/dom";
beforeEach(() => {
  resetTestState();
});

describe("dom", () => {
  describe("mount edge cases", () => {
    test("resolveNode with raw Node instance appends directly", () => {
      const rawSpan = document.createElement("span");
      rawSpan.id = "raw-node";
      rawSpan.textContent = "raw";

      mount(<div id="raw-parent">{rawSpan}</div>);
      expect(document.querySelector("#raw-parent #raw-node")?.textContent).toBe("raw");
    });

    test("component scope transfers to mounted DOM element", () => {
      const disposed = vi.fn(() => {});
      const Comp = () => {
        scope(() => {});
        const node = <div id="scoped-comp">Comp</div>;
        node.componentScope = disposed;
        return node;
      };

      mount(
        <div>
          <Comp></Comp>
        </div>,
      );

      const el = document.getElementById("scoped-comp")!;
      expect(typeof peekState(el)?.componentScope).toBe("function");
    });

    test("error config transfers to element during mount", () => {
      onError((err, ctx) => ctx.config?.fallback?.(err) ?? null);

      const fallback = (_err: Error) => <span id="fallback">{_err.message}</span>;
      mount(
        <div id="boundary" error:boundary error:fallback={fallback}>
          {() => {
            throw new Error("mount error");
          }}
        </div>,
      );

      expect(document.getElementById("fallback")).not.toBeNull();
      onError(null);
    });
  });
});
