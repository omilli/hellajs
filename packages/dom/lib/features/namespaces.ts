import type { HellaElement } from "../types/nodes";
import { setNamespaceResolution, HTML_NS } from "../internal/render";

const SVG_NS = "http://www.w3.org/2000/svg";
const MATHML_NS = "http://www.w3.org/1998/Math/MathML";

/**
 * Creates elements in their authored namespace: an `svg` root always creates in the SVG
 * namespace and a `math` root in MathML; other tags create in the inherited namespace
 * when mounted under a foreign-namespace parent, else HTML.
 * @param tag The tag to create
 * @param ns The namespace URI inherited from the insertion parent, or undefined for HTML
 * @returns The created element
 */
function createDomElement(tag: string, ns: string | undefined): HellaElement {
  if (tag === "svg") return document.createElementNS(SVG_NS, tag) as HellaElement;
  if (tag === "math") return document.createElementNS(MATHML_NS, tag) as HellaElement;
  return (ns ? document.createElementNS(ns, tag) : document.createElement(tag)) as HellaElement;
}

/**
 * Derives the creation namespace for children of `parent`: the parent's own namespace when it is
 * a foreign (SVG/MathML) element; `undefined` for HTML parents, fragments, text anchors, and
 * `foreignObject` (an HTML integration point inside SVG — its children reset to HTML).
 * @param parent The node whose children are being created
 * @returns The namespace URI to create children in, or undefined for HTML
 */
function childNamespaceOf(parent: Node | null): string | undefined {
  if (!parent) return undefined;
  const element = parent as Element;
  if (element.localName === "foreignObject") return undefined;
  const ns = element.namespaceURI;
  return ns && ns !== HTML_NS ? ns : undefined;
}

setNamespaceResolution({ createDomElement, childNamespaceOf });
