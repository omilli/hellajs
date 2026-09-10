/**
 * Entry for `bun remote` — the phone-control daemon over the tailnet.
 *
 * Default: run the daemon in the foreground until SIGINT, logging the
 * bound port, the panel token location, the Tailscale Serve setup, and
 * the ntfy push guidance. `--probe` runs the self-test chain instead.
 */

import { DEFAULT_PORT, DEFAULT_STATE_DIR, startRemoteServer } from "./remote/server.js";
import { runProbe } from "./remote/probe.js";
import { notify } from "./remote/notify.js";
import { logger } from "./utils/index.js";

/** Parsed CLI args. */
interface RemoteArgs {
  port: number;
  probe: boolean;
  model: string | null;
}

/**
 * Parse and validate CLI args.
 *
 * @param argv Raw argv after the script path.
 * @returns The validated remote configuration.
 */
function parseArgs(argv: string[]): RemoteArgs {
  const args: RemoteArgs = { port: DEFAULT_PORT, probe: false, model: null };

  for (const arg of argv) {
    if (arg === "--probe") {
      args.probe = true;
      continue;
    }
    const equals = arg.indexOf("=");
    if (!arg.startsWith("--") || equals === -1) {
      throw new Error(`unexpected argument "${arg}" (expected --port=<n>, --probe, or --model=<provider/id[:thinking]>)`);
    }
    const key = arg.slice(0, equals);
    const value = arg.slice(equals + 1);

    if (key === "--port") {
      if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 65535) {
        throw new Error(`invalid --port "${value}" (expected an integer 1-65535)`);
      }
      args.port = Number(value);
    } else if (key === "--model") {
      if (value === "") {
        throw new Error("invalid --model (expected provider/id[:thinking])");
      }
      args.model = value;
    } else {
      throw new Error(`unknown flag "${key}"`);
    }
  }

  return args;
}

/**
 * Print the daemon banner: panel URL, token location, tailnet setup (raw TCP
 * forward primary; HTTP and HTTPS variants carry their phone-DNS and ACME
 * dependencies), push guidance.
 *
 * @param port The bound TCP port.
 */
function printBanner(port: number): void {
  logger.success(`remote daemon listening: http://127.0.0.1:${port}`);
  logger.info(`  panel token: cat .remote/token   (the panel asks for it on first load)`);
  logger.info(`  tailnet:     tailscale serve --bg --tcp=8798 ${port}   (raw TCP pipe, no DNS or Host matching; phone opens http://$(tailscale ip -4):8798)`);
  logger.info(`  alt:         tailscale serve --bg --http=${port} ${port}   (HTTP at the MagicDNS name; phone DNS must resolve it: Chrome "Use secure DNS" and Android "Private DNS" off)`);
  logger.info(`  https:       tailscale serve --bg ${port}   (443 at the MagicDNS name; needs outbound ACME egress to Let's Encrypt, else the TLS handshake hangs)`);
  logger.info(`  push:        set "ntfyTopic" in .remote/config.json for ntfy pings on start and run exits`);
  logger.info(`  privacy:     self-host ntfy on the laptop and point "ntfyBase" at it to keep push inside the VPN`);
}

async function main(): Promise<void> {
  try {
    const args = parseArgs(process.argv.slice(2));
    if (args.probe) {
      await runProbe({ model: args.model });
      return;
    }
    const remote = await startRemoteServer({ port: args.port, model: args.model ?? undefined });
    printBanner(remote.port);
    void notify("remote: daemon started", `panel listening on http://127.0.0.1:${remote.port}`, DEFAULT_STATE_DIR);
    process.on("SIGINT", (): void => {
      void remote.stop().then((): void => {
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error(`Remote failed: ${(error as Error).message}`);
    process.exit(1);
  }
}

if (import.meta.main) {
  main().catch((error: Error) => {
    logger.error("Fatal error:", error);
    process.exit(1);
  });
}
