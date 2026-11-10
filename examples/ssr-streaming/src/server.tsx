import { cssText } from "@hellajs/css";
import { ssr, doc } from "@hellajs/ssr";
import { Dashboard } from "./app";
import "./theme";

export function render(): ReadableStream<string> {
  return doc({
    lang: "en",
    mount: "#app",
    head: {
      title: "Dashboard",
      meta: [{ charset: "UTF-8" }],
      raw: `<style id="hella-css">${cssText()}</style>`,
      scripts: [{ type: "module", src: "/src/client.tsx" }],
    },
    body: ssr.stream(<Dashboard />),
  });
}
