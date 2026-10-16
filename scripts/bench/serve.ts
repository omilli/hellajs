/**
 * Static server for the staged benchmark app.
 *
 * Serves `.bench/` on an ephemeral port: `/<label>/` resolves to
 * `<label>/index.html`, every other path to the file under `.bench/`.
 * The caller stops the server (`server.close()`) once the driver resolves.
 */

import fsStat from "node:fs";
import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { projectRoot } from "../utils/index.ts";

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
  /** The underlying node HTTP server — call `close()` when the run finishes. */
  readonly server: http.Server;
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
 * @param response The server response to write.
 */
async function serve(request: http.IncomingMessage, response: http.ServerResponse): Promise<void> {
  const { pathname } = new URL(request.url ?? "/", "http://localhost");
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  if (relative === "") {
    response.statusCode = 404;
    response.end("Not found");
    return;
  }

  const resolved = path.resolve(benchDir, relative);
  if (!resolved.startsWith(benchDir + path.sep)) {
    response.statusCode = 403;
    response.end("Forbidden");
    return;
  }

  const target =
    pathname.endsWith("/") || path.extname(resolved) === ""
      ? path.join(resolved, "index.html")
      : resolved;
  try {
    const stat = await fs.stat(target);
    if (!stat.isFile()) {
      response.statusCode = 404;
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "content-type": contentTypeFor(target),
      "content-length": stat.size,
    });
    fsStat.createReadStream(target).pipe(response);
  } catch {
    response.statusCode = 404;
    response.end("Not found");
  }
}

/**
 * Start the bench static server on an ephemeral port.
 *
 * @returns The running server handle and its assigned port, once bound.
 */
export function startBenchServer(): Promise<BenchServer> {
  const server = http.createServer((request, response) => {
    serve(request, response).catch(() => response.destroy());
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        server.close();
        reject(new Error("bench server bound no TCP port (unix socket?)"));
        return;
      }
      resolve({ server, port: address.port });
    });
  });
}
