/**
 * Static server for the staged benchmark app.
 *
 * Serves `.bench/` on an ephemeral port: `/<label>/` resolves to
 * `<label>/index.html`, every other path to the file under `.bench/`.
 * The caller stops the server (`server.stop(true)`) once the driver resolves.
 */

import path from "node:path";
import { projectRoot } from "../utils/index.js";

const benchDir = path.join(projectRoot, ".bench");

const MIME_TYPES: Record<string, string> = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
};

export interface BenchServer {
  /** The underlying Bun server — call `stop(true)` when the run finishes. */
  readonly server: Bun.Server<undefined>;
  /** The OS-assigned ephemeral port the server listens on. */
  readonly port: number;
}

/**
 * Resolve the content type for a served file.
 *
 * @param filePath Absolute path of the file being served.
 * @returns The MIME type (extension-based; octet-stream fallback).
 */
function contentTypeFor(filePath: string): string {
  return MIME_TYPES[path.extname(filePath)] ?? "application/octet-stream";
}

/**
 * Serve one request from `.bench/`, blocking path traversal.
 *
 * @param request The incoming request.
 * @returns The file response, or a 404/403 error response.
 */
async function fetch(request: Request): Promise<Response> {
  const { pathname } = new URL(request.url);
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (relative === "") {
    return new Response("Not found", { status: 404 });
  }

  const resolved = path.resolve(benchDir, relative);
  if (!resolved.startsWith(benchDir + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }

  const target =
    pathname.endsWith("/") || path.extname(resolved) === ""
      ? path.join(resolved, "index.html")
      : resolved;
  const file = Bun.file(target);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(file, {
    headers: { "content-type": contentTypeFor(target) },
  });
}

/**
 * Start the bench static server on an ephemeral port.
 *
 * @returns The running server handle and its assigned port.
 */
export function startBenchServer(): BenchServer {
  const server = Bun.serve({ port: 0, fetch });
  const { port } = server;
  if (port === undefined) {
    throw new Error("bench server bound no TCP port (unix socket?)");
  }
  return { server, port };
}
