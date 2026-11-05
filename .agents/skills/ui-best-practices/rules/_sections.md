| prefix | title | impact | description |
|---|---|---|---|
| own | Ownership model | CRITICAL | no runtime import surface, the copy is user code, deliberate updates via add --overwrite |
| cli | CLI workflow | HIGH | init/add/list flow, config-vs-flag precedence, name discovery, peer installs, plain-JS delivery |
| variant | Style variants | HIGH | css vs tailwind splicing contract, class-prop override mechanics, canonical/marker internals vs the copy |
| theme | Theming | HIGH | tokens.ts / theme.css split, import-once entry wiring, .dark class toggling, dark-default themeMode (css only) |
| api | Programmatic API | MEDIUM | addComponent, loadRegistry, listComponents, readConfig, main for scaffolding and generators |
