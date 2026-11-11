---
title: Pass --ignore-lock to astro preview in agent-run Playwright webServers
description: "astro 7.x `preview` daemonizes and exits 0 when it detects an agent environment, breaking Playwright's webServer contract; `--ignore-lock` keeps the server foreground in both human and agent sessions."
tags: [astro, playwright, e2e, webserver, examples, daemon]
confirmed: 2026-11-11
---
# Why

`astro preview` (v7.x) auto-backgrounds its server when `isRunByAgent()` detects an agent environment — the foreground process forks a daemon, prints the pid, and exits 0 immediately. A Playwright `webServer.command` invoking it therefore fails every run under an agent session with "Process from config.webServer exited early", while the identical command works from a human terminal — an environment-dependent breakage that looks like a config typo but is not. `--ignore-lock` is astro's documented escape hatch: it opts the instance out of agent-inferred backgrounding AND lockfile tracking ("a one-off foreground server that `stop`/`status`/`logs` won't track" — astro's own source comment), so the process stays foreground and dies with Playwright's teardown in both contexts. Append it to any example `playwright.config.ts` webServer command that ends in `astro preview`.

# Evidence

2026-11-11: `examples/astro-islands/node_modules/astro/dist/cli/preview/index.js` — `const wantsBackground = !!flags.background || supportsAgentAutoBackgrounding(process.platform) && agentDetected && !ignoreLock;` with `agentDetected = !process.env.ASTRO_PREVIEW_BACKGROUND && isRunByAgent()`. Probe on port 4318 (astro v7.4.0): bare `npm run preview -- --port 4318 --strictPort` exited code 0 within 8s while an orphaned daemon served the port; same command with `--ignore-lock` kept the process alive, printed the ready banner, and served 200. `./node_modules/.bin/vp run e2e astro-islands` exit 0 (5 passed) only with `--ignore-lock`; the bare-command config run failed with "Process from config.webServer exited early".
