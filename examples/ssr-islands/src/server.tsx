import { readFileSync } from "node:fs";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { ssr, doc } from "@hellajs/ssr";
import { App, styles } from "./app.js";

// Serve the client bundle emitted by build.mjs. The server no longer bundles at
// startup: JSX cannot run under raw `node`, so build.mjs compiles both entries
// (client + server) before this file ever boots.
const client = readFileSync(new URL("../dist/client.js", import.meta.url), "utf8");

const app = new Hono();

// Serve the client bundle from disk.
app.get("/client.js", (c) =>
  c.body(client, 200, { "content-type": "text/javascript; charset=utf-8" }),
);

app.get("*", (c) =>
  c.html(
    doc({
      head: {
        title: "SSR Islands",
        styles: [styles],
        scripts: [{ src: "/client.js", type: "module" }],
      },
      // `ssr()` walks the view tree to an HTML string; `doc()` wraps it into a full
      // document and injects the stylesheet and the client script.
      body: ssr(App()),
    }),
  ),
);

serve({ fetch: app.fetch, port: 3000 });
