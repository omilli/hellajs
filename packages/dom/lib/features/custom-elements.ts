import { setCloneUpgrader, HTML_NS } from "../internal/render";

/**
 * True when any element in the parsed tree has a hyphenated local name — a custom-element
 * candidate whose `customElements.define` may postdate the parse (the compiler hoists
 * `template(...)` calls to module evaluation). Runs once per unique html string at builder
 * creation; create fns for standard-element templates skip the upgrade walk entirely.
 * @param node The node to scan
 * @returns True when the tree contains a hyphenated element
 */
function containsCustomElement(node: Node): boolean {
  if (node.nodeType !== Node.ELEMENT_NODE) return false;
  if ((node as Element).localName.includes("-")) return true;
  const children = node.childNodes;
  let i = 0;
  while (i < children.length) {
    if (containsCustomElement(children[i]!)) return true;
    i++;
  }
  return false;
}

/**
 * Re-creates a defined custom element as an upgraded instance, moving attributes and
 * children across — or returns undefined when no upgrade applies (foreign namespace,
 * no hyphen, no definition, already upgraded). The walker's `createElement` upgraded
 * synchronously because it ran at mount time, always after `define`; the flagged path
 * clones a template whose parse may precede it, and happy-dom's `customElements.upgrade`
 * is a no-op, so the create fn performs the upgrade itself.
 * @param element The clone to upgrade
 * @returns The upgraded replacement, or undefined when no upgrade applies
 */
function upgradedShell(element: Element): Element | undefined {
  if (element.namespaceURI !== HTML_NS) return undefined;
  const local = element.localName;
  if (!local.includes("-")) return undefined;
  const ctor = customElements.get(local);
  if (!ctor || element instanceof ctor) return undefined;
  const fresh = document.createElement(local);
  const attrs = element.attributes;
  let i = 0;
  while (i < attrs.length) {
    const attr = attrs[i]!;
    fresh.setAttribute(attr.name, attr.value);
    i++;
  }
  while (element.firstChild) fresh.appendChild(element.firstChild);
  return fresh;
}

/**
 * Upgrades every defined custom element in a fresh clone, depth-first, replacing shells
 * under `parent` in place. Wiring calls after the create fn therefore always see the real
 * accessors (`renderProp`'s custom-element property branch), and insertion never re-upgrades —
 * a connect-time upgrade would re-run constructor field initializers and clobber wired values.
 * @param parent The parent whose element children upgrade in place
 */
function upgradeClones(parent: Node): void {
  const children = Array.from(parent.childNodes);
  let i = 0;
  while (i < children.length) {
    const child = children[i]!;
    if (child.nodeType === Node.ELEMENT_NODE) {
      const fresh = upgradedShell(child as Element);
      if (fresh) parent.replaceChild(fresh, child);
      upgradeClones(fresh ?? child);
    }
    i++;
  }
}

/**
 * The create-time upgrade pass over one fresh clone: re-creates the node itself when it
 * is a defined custom element (the single-root arm swaps the returned replacement in),
 * then walks descendants in place (the fragment arm ignores the return — a fragment is
 * never an element, so {@linkcode upgradedShell} declines it).
 * @param node The fresh clone
 * @returns The replacement when the node itself upgraded, else the node passed through
 */
function upgradeClone(node: Node): Node {
  const fresh = upgradedShell(node as Element);
  if (fresh) return fresh;
  upgradeClones(node);
  return node;
}

setCloneUpgrader({ hasCustomElements: containsCustomElement, upgradeClone });
