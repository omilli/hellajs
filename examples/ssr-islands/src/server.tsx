import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { cssText } from "@hellajs/css";
import { ssr, doc } from "@hellajs/ssr";
import { App } from "./app";

const client = readFileSync(new URL("../dist/client.js", import.meta.url), "utf8");

const app = new Hono();

app.get("/client.js", (c) =>
  c.body(client, 200, { "content-type": "text/javascript; charset=utf-8" }),
);

app.get("*", (c) =>
  c.html(
    doc({
      lang: "en",
      head: {
        title: "SSR Islands",
        raw: `<style id="hella-css">${cssText()}</style>`,
        scripts: [{ src: "/client.js", type: "module" }],
      },
      body: ssr(App()),
    }),
  ),
);

serve({ fetch: app.fetch, port: Number(process.env.PORT) || 3000 });
