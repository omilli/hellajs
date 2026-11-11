---
title: Assert style-tag content via textContent, not toContainText
description: Playwright text assertions read innerText, which is empty for <style>/<script> elements — assert their content via locator.textContent().
tags: [playwright, e2e, toContainText, innerText, textContent, style-tag]
confirmed: 2026-11-10
---
# Why

`expect(locator).toContainText(...)` and the other text matchers read
`innerText`, and `<style>`/`<script>` elements are never rendered, so
`innerText` is `""` no matter what they contain — the assertion fails with
"unexpected value" even though the call log shows the element resolved with
the full expected text. Asserting delivered CSS (e.g. a `cssText()` style tag
in an SSR page) against its content silently breaks; `locator.textContent()`
returns the raw text node content for these elements.

# Evidence

Playwright 1.64 failure log from an e2e spec asserting
`<style id="hella-css">` content: `Locator: locator('#hella-css') · Expected
substring: "button" · Received string: ""` while the call log's resolution
line showed `<style id="hella-css">button { padding: 0.5rem 1rem; border: …`
— switching the test to `const css = await page.locator("#hella-css")
.textContent(); expect(css).toContain("button")` made the suite pass
(`vp run e2e ssr-islands`, 5 passed).
