---
type: decision
title: "Flash hunting: Playwright channel-chrome + CDP CPU throttle + per-frame getComputedStyle sampler"
description: "For docs-site load flashes: channel-chrome Playwright + 6× CDP CPU throttle + a rAF getComputedStyle sampler beats video (no ffmpeg; pre-commit screenshots throw). Probes live in gitignored docs/dist."
tags: [testing, playwright, docs-site]
timestamp: 2026-06-27
last_confirmed: 2026-06-27
triggers: [flash-debug, hydration-style, probe-script, cpu-throttle]
---
# Why
`chromium.launch({ channel: "chrome", headless: true })` uses system Chrome (no
browser download); `page.context().newCDPSession(page)` +
`Emulation.setCPUThrottlingRate({ rate: 6 })` widens sub-30ms windows to
visible size; a rAF loop that logs `getComputedStyle(...).position/color`
whenever the state string changes yields the exact flip timestamps — no
video/ffmpeg needed. Playwright lives at the repo root `node_modules/playwright`
(1.63.0). Throwaway probes belong in gitignored `docs/dist/` and must be
rewritten after every `bun run build` (the build wipes dist).
# Evidence
Unit 10 review gate: the sampler located the /ui flash window (462ms→620ms at
6×) after recordVideo failed on missing ffmpeg-1011 and pre-commit screenshots
throw; post-fix it showed one stable state per page.
