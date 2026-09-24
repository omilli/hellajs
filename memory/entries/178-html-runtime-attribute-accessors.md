---
type: decision
title: "html-runtime attribute accessors must return strings (or undefined), never raw booleans: falsy values drop the attribute while the JSX flavor renders \"false\""
description: "In html-format canonicals, a reactive attribute accessor returning raw `false` drops the attribute; return \"true\"/\"false\" strings to render it, matching the jsx flavor's data-* stringification.",
tags: [dom, registry]
timestamp: 2026-09-22
last_confirmed: 2026-09-22
triggers: [html-canonical, reactive-attribute, registry-component]
---
# Why

The html template runtime's attribute binding treats falsy resolved values (false, null,
undefined) as "absent" and removes the attribute. A `data-error="${hasError}"` accessor
returning a raw boolean therefore renders NOTHING in the html flavor while the jsx flavor
(`data-error={hasError() ? "true" : "false"}`) renders `data-error="false"` — the two
flavors of the same component silently diverge, `assertStructuralParity` fails, and
`data-[error=true]` style hooks still work but the "false" state hook vanishes. The fix is
a string-returning accessor pair (`errorFlag = (): "true" | "false" => ...`) beside the
boolean predicate. Checkbox's `ariaChecked` already followed this shape; FormLabel hit the
trap because its predicate returned raw boolean.

# Evidence

Unit 19 (form) first `bun test packages/ui/tests/form.test.ts` run: 3 failures, all html
flavors — parity diff showed `data-error="false"` expected, attribute absent received, for
`registry/form/form-html.ts` FormLabel. Renaming the accessor to return `"true" | "false"`
(keep a separate `invalid = (): "true" | undefined` for aria-invalid, where absence IS the
clean semantic) fixed all three; the rerun passed 78/78. AGENTS.md gotchas cover
function-valued-expression stringification and array-slot binding but not this falsy drop.
