/**
 * The remote daemon's HTTP surface: panel statics and the bearer token
 * (`scripts/remote/server.ts` wires these into `Bun.serve`).
 *
 * Statics are served without auth (generic assets; the credential gate is
 * the WS `hello` token), path-traversal guarded, with the token file
 * auto-generated `node:crypto` random on first start at mode 0600 — it is
 * the panel's only credential.
 */

import { randomBytes } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { ensureDir, fileExists, scriptsDir } from "../utils/index.js";

/** The directory holding the panel static assets. */
const panelDir = path.join(scriptsDir, "remote", "panel");

/** MIME types for the panel statics. */
const MIME_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

/**
 * Read the state dir token, generating and persisting a fresh one on first
 * start (mode 0600 — it is the panel's only credential).
 *
 * @param stateDir Daemon state directory.
 * @returns The bearer token.
 */
export async function readOrCreateToken(stateDir: string): Promise<string> {
  const tokenPath = path.join(stateDir, "token");
  if (await fileExists(tokenPath)) {
    const existing = (await fs.readFile(tokenPath, "utf8")).trim();
    if (existing.length > 0) {
      return existing;
    }
  }
  await ensureDir(stateDir);
  const token = randomBytes(24).toString("base64url");
  await fs.writeFile(tokenPath, token + "\n", { mode: 0o600 });
  return token;
}

/**
 * Serve one panel static file (path-traversal guarded).
 *
 * @param pathname The request pathname; `/` resolves to `index.html`.
 * @returns The file response, or a 403/404 error response.
 */
export async function servePanel(pathname: string): Promise<Response> {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, "");
  const target = relative === "" ? path.join(panelDir, "index.html") : path.resolve(panelDir, relative);
  if (!target.startsWith(panelDir + path.sep)) {
    return new Response("Forbidden", { status: 403 });
  }
  const file = Bun.file(target);
  if (!(await file.exists())) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(file, {
    headers: { "content-type": MIME_TYPES[path.extname(target)] ?? "application/octet-stream" },
  });
}
