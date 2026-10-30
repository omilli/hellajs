---
title: "Force-click disabled items in Playwright probes: the actionability gate refuses the click, so not-selectable needs force plus a behavioral assertion"
description: "Playwright's locator.click() times out (30s) on elements carrying data-disabled/aria-disabled because its own actionability check rejects them — assert not-selectable with click({ force: true }) then panel-still-open and value-unchanged, never a plain click."
tags: [playwright, probe, disabled, click, actionability, ui, select]
confirmed: 2026-10-30
---
# Why

A probe that verifies "the disabled option is not selectable" with a plain `locator.click()` on the disabled item hangs for Playwright's full 30s timeout and throws `TimeoutError`: the actionability log shows the locator resolved but `element is not enabled`, retrying until abort. The refusal is the gate working, not the behavior under test failing — but as written the probe crashes instead of reporting, and the crash looks like a broken dropdown. Without `force: true`, every disabled-interaction probe in a browser-based verification burns the timeout and a rewrite.

# Evidence

Confirmed 2026-10-30 against the docs site select page probe (system Chrome, `chromium.launch({ channel: "chrome" })`): the disabled `Date` option (`role="option"`, `data-disabled="true"`, `aria-disabled="true"`) timed out under plain `click()` with `element is not enabled` in the retry log; the same click with `{ force: true }` dispatched, and the behavioral assertions held — the listbox stayed open and the trigger text was unchanged, while clicking a sibling enabled option selected it and closed the panel (`node u04-select-probe.mjs post` exit 0). The repo's own precedent for behavioral-over-actionability probing: `scripts/bench/driver.ts` launches the same channel-Chrome browser.
