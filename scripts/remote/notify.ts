/**
 * ntfy push notifications for the remote daemon (`scripts/remote/server.ts`).
 *
 * One `fetch` POST per notification to `<ntfyBase>/<ntfyTopic>`, configured
 * via `<stateDir>/config.json` (`{ "ntfyTopic": string, "ntfyBase": string }`,
 * base defaulting to `https://ntfy.sh`). Unconfigured state is a no-op with
 * a single warning per process.
 */

import path from "node:path";
import { logger, readJson } from "../utils/index.js";

/** Parsed `<stateDir>/config.json` (absent fields fall back to defaults). */
export interface NotifyConfig {
  ntfyTopic?: string;
  ntfyBase?: string;
}

/** Default ntfy instance used when `ntfyBase` is not configured. */
const DEFAULT_BASE = "https://ntfy.sh";

/** State dirs already warned about being unconfigured (warn once each). */
const warnedStateDirs = new Set<string>();

/**
 * Read the notify config from a state dir.
 *
 * @param stateDir Daemon state directory holding `config.json`.
 * @returns The parsed config, or an empty object when absent or invalid.
 */
async function readConfig(stateDir: string): Promise<NotifyConfig> {
  try {
    return await readJson<NotifyConfig>(path.join(stateDir, "config.json"));
  } catch {
    return {};
  }
}

/**
 * Send one ntfy push notification.
 *
 * Content policy: `body` must be a fixed template plus at most the title
 * string — never dialog message bodies, prefill, or run output chunks
 * (push leaves the machine; only titles and templates travel). Failures
 * (network, bad config) warn and return; notification is best-effort and
 * never fails the daemon. Pointing `ntfyBase` at a self-hosted ntfy
 * (single binary, on the laptop, reachable over the tailnet) keeps push
 * inside the VPN with zero third parties.
 *
 * @param title Notification title (also repeated by the ntfy `Title` header).
 * @param body Fixed-template message body.
 * @param stateDir Daemon state directory holding `config.json`.
 */
export async function notify(title: string, body: string, stateDir: string): Promise<void> {
  const config = await readConfig(stateDir);
  if (typeof config.ntfyTopic !== "string" || config.ntfyTopic.length === 0) {
    if (!warnedStateDirs.has(stateDir)) {
      warnedStateDirs.add(stateDir);
      logger.warn(
        `ntfy not configured: set "ntfyTopic" in ${path.join(stateDir, "config.json")} for phone pings (no-op for now)`,
      );
    }
    return;
  }
  const base = typeof config.ntfyBase === "string" && config.ntfyBase.length > 0
    ? config.ntfyBase.replace(/\/+$/, "")
    : DEFAULT_BASE;
  try {
    await fetch(`${base}/${config.ntfyTopic}`, {
      method: "POST",
      headers: { Title: title },
      body,
    });
  } catch (error) {
    logger.warn(`ntfy push failed: ${(error as Error).message}`);
  }
}

/**
 * Push the gate-waiting notification for one blocking dialog fan-out.
 *
 * Fixed template plus the dialog title only — the signature accepts
 * nothing else, so message bodies, prefill, and option content cannot
 * travel (the push-content policy from `01-daemon-core` is structural).
 *
 * @param title The dialog title ("dialog" when absent).
 * @param stateDir Daemon state directory holding `config.json`.
 */
export async function notifyGate(title: string | undefined, stateDir: string): Promise<void> {
  await notify("remote: gate waiting", title ?? "dialog", stateDir);
}
