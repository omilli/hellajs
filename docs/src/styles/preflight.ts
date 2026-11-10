/**
 * Site preflight: the package `reset` (a rule-for-rule port of tailwindcss's
 * preflight.css, https://github.com/tailwindlabs/tailwindcss/blob/main/
 * packages/tailwindcss/preflight.css) registered unlayered, like every site
 * sheet; specificity - never cascade-layer rank - keeps its element
 * selectors under the class-scoped chrome and registry rules registered
 * alongside it.
 */

import { css, reset } from "@hellajs/css";

css(reset);
