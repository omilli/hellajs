/**
 * A type that can either be the raw value or a Signal containing that value.
 * @template T
 */
import type { VNodePrimative } from "./nodes";

/**
 * Global HTML attributes that apply to all elements.
 */
export interface GlobalHTMLAttributes {
  id?: VNodePrimative;
  class?: VNodePrimative;
  style?: VNodePrimative;
  title?: VNodePrimative;
  tabindex?: VNodePrimative<number>;
  hidden?: VNodePrimative<boolean>;
  draggable?: VNodePrimative<boolean>;
  dir?: VNodePrimative<"ltr" | "rtl" | "auto">;
  lang?: VNodePrimative;
  slot?: VNodePrimative;
  for?: VNodePrimative;
  accesskey?: VNodePrimative;
  contenteditable?: VNodePrimative<boolean | "true" | "false">;
  // HTML5 custom data attributes (data-*)
  [key: `data-${string}`]: VNodePrimative;

  // ARIA attributes
  role?: VNodePrimative;
  "aria-label"?: VNodePrimative;
  "aria-labelledby"?: VNodePrimative;
  "aria-describedby"?: VNodePrimative;
  "aria-atomic"?: VNodePrimative<boolean | "true" | "false">;
  "aria-autocomplete"?: VNodePrimative<"none" | "inline" | "list" | "both">;
  "aria-busy"?: VNodePrimative<boolean | "true" | "false">;
  "aria-checked"?: VNodePrimative<boolean | "true" | "false" | "mixed">;
  "aria-colcount"?: VNodePrimative<number>;
  "aria-colindex"?: VNodePrimative<number>;
  "aria-colspan"?: VNodePrimative<number>;
  "aria-controls"?: VNodePrimative;
  "aria-current"?: VNodePrimative<boolean | "true" | "false" | "page" | "step" | "location" | "date" | "time">;
  "aria-disabled"?: VNodePrimative<boolean | "true" | "false">;
  "aria-expanded"?: VNodePrimative<boolean | "true" | "false">;
  "aria-haspopup"?: VNodePrimative<boolean | "true" | "false" | "menu" | "listbox" | "tree" | "grid" | "dialog">;
  "aria-hidden"?: VNodePrimative<boolean | "true" | "false">;
  "aria-invalid"?: VNodePrimative<boolean | "true" | "false" | "grammar" | "spelling">;
  "aria-keyshortcuts"?: VNodePrimative;
  "aria-level"?: VNodePrimative<number>;
  "aria-live"?: VNodePrimative<"off" | "assertive" | "polite">;
  "aria-modal"?: VNodePrimative<boolean | "true" | "false">;
  "aria-multiline"?: VNodePrimative<boolean | "true" | "false">;
  "aria-multiselectable"?: VNodePrimative<boolean | "true" | "false">;
  "aria-orientation"?: VNodePrimative<"horizontal" | "vertical">;
  "aria-owns"?: VNodePrimative;
  "aria-placeholder"?: VNodePrimative;
  "aria-posinset"?: VNodePrimative<number>;
  "aria-pressed"?: VNodePrimative<boolean | "true" | "false" | "mixed">;
  "aria-readonly"?: VNodePrimative<boolean | "true" | "false">;
  "aria-required"?: VNodePrimative<boolean | "true" | "false">;
  "aria-roledescription"?: VNodePrimative;
  "aria-rowcount"?: VNodePrimative<number>;
  "aria-rowindex"?: VNodePrimative<number>;
  "aria-rowspan"?: VNodePrimative<number>;
  "aria-selected"?: VNodePrimative<boolean | "true" | "false">;
  "aria-setsize"?: VNodePrimative<number>;
  "aria-sort"?: VNodePrimative<"none" | "ascending" | "descending" | "other">;
  "aria-valuemax"?: VNodePrimative<number>;
  "aria-valuemin"?: VNodePrimative<number>;
  "aria-valuenow"?: VNodePrimative<number>;
  "aria-valuetext"?: VNodePrimative;

  // Add index signature to allow arbitrary string keys
  [key: string]: unknown;

  // Event handlers - no signals for event handlers
  onclick?: (event: MouseEvent, element?: HTMLElement) => void;
  ondblclick?: (event: MouseEvent, element?: HTMLElement) => void;
  onmousedown?: (event: MouseEvent, element?: HTMLElement) => void;
  onmouseup?: (event: MouseEvent, element?: HTMLElement) => void;
  onmouseover?: (event: MouseEvent, element?: HTMLElement) => void;
  onmousemove?: (event: MouseEvent, element?: HTMLElement) => void;
  onmouseout?: (event: MouseEvent, element?: HTMLElement) => void;
  onkeypress?: (event: KeyboardEvent, element?: HTMLElement) => void;
  onkeydown?: (event: KeyboardEvent, element?: HTMLElement) => void;
  onkeyup?: (event: KeyboardEvent, element?: HTMLElement) => void;
  onfocus?: (event: FocusEvent, element?: HTMLElement) => void;
  onblur?: (event: FocusEvent, element?: HTMLElement) => void;
  onchange?: (event: Event, element?: HTMLElement) => void;
  onsubmit?: (event: SubmitEvent, element?: HTMLElement) => void;
  onreset?: (event: Event, element?: HTMLElement) => void;
  oninput?: (event: InputEvent, element?: HTMLElement) => void;
  onselect?: (event: Event, element?: HTMLElement) => void;
  onload?: (event: Event, element?: HTMLElement) => void;
  onerror?: string | ((event: Event, element?: HTMLElement) => void);
}

// Element-specific attributes
interface AnchorHTMLAttributes extends GlobalHTMLAttributes {
  href?: VNodePrimative;
  target?: VNodePrimative<"_blank" | "_self" | "_parent" | "_top">;
  rel?: VNodePrimative;
  download?: unknown;
  hreflang?: VNodePrimative;
  type?: VNodePrimative;
  referrerpolicy?: VNodePrimative<
    "no-referrer" |
    "no-referrer-when-downgrade" |
    "origin" |
    "origin-when-cross-origin" |
    "unsafe-url"
  >;
  ping?: VNodePrimative;
}

interface ButtonHTMLAttributes extends GlobalHTMLAttributes {
  type?: VNodePrimative<"button" | "submit" | "reset">;
  disabled?: VNodePrimative<boolean>;
  form?: VNodePrimative;
  formaction?: VNodePrimative;
  formenctype?: VNodePrimative;
  formmethod?: VNodePrimative;
  formnovalidate?: VNodePrimative<boolean>;
  formtarget?: VNodePrimative;
  name?: VNodePrimative;
  value?: VNodePrimative;
  autofocus?: VNodePrimative<boolean>;
}

interface InputHTMLAttributes extends GlobalHTMLAttributes {
  type?: VNodePrimative<
    "button" |
    "checkbox" |
    "color" |
    "date" |
    "datetime-local" |
    "email" |
    "file" |
    "hidden" |
    "image" |
    "month" |
    "VNodePrimative<number>" |
    "password" |
    "radio" |
    "range" |
    "reset" |
    "search" |
    "submit" |
    "tel" |
    "text" |
    "time" |
    "url" |
    "week"
  >;
  name?: VNodePrimative;
  value?: VNodePrimative;
  disabled?: VNodePrimative<boolean>;
  checked?: VNodePrimative<boolean>;
  placeholder?: VNodePrimative;
  readOnly?: VNodePrimative<boolean>;
  required?: VNodePrimative<boolean>;
  min?: VNodePrimative;
  max?: VNodePrimative;
  step?: VNodePrimative;
  pattern?: VNodePrimative;
  accept?: VNodePrimative;
  autocomplete?: VNodePrimative;
  autofocus?: VNodePrimative<boolean>;
  capture?: VNodePrimative<boolean | "user" | "environment">;
  dirname?: VNodePrimative;
  form?: VNodePrimative;
  formaction?: VNodePrimative;
  formenctype?: VNodePrimative;
  formmethod?: VNodePrimative;
  formnovalidate?: VNodePrimative<boolean>;
  formtarget?: VNodePrimative;
  height?: VNodePrimative;
  list?: VNodePrimative;
  maxlength?: VNodePrimative<number>;
  minlength?: VNodePrimative<number>;
  multiple?: VNodePrimative<boolean>;
  size?: VNodePrimative<number>;
  src?: VNodePrimative;
  width?: VNodePrimative;
}

// Additional HTML element interfaces

interface AreaHTMLAttributes extends GlobalHTMLAttributes {
  alt?: VNodePrimative;
  coords?: VNodePrimative;
  download?: unknown;
  href?: VNodePrimative;
  hreflang?: VNodePrimative;
  media?: VNodePrimative;
  referrerpolicy?: VNodePrimative;
  rel?: VNodePrimative;
  shape?: VNodePrimative<"rect" | "circle" | "poly" | "default">;
  target?: VNodePrimative;
  type?: VNodePrimative;
}

interface AudioHTMLAttributes extends GlobalHTMLAttributes {
  autoplay?: VNodePrimative<boolean>;
  controls?: VNodePrimative<boolean>;
  crossorigin?: VNodePrimative<"anonymous" | "use-credentials">;
  loop?: VNodePrimative<boolean>;
  muted?: VNodePrimative<boolean>;
  preload?: VNodePrimative<"none" | "metadata" | "auto">;
  src?: VNodePrimative;
}

interface BaseHTMLAttributes extends GlobalHTMLAttributes {
  href?: VNodePrimative;
  target?: VNodePrimative;
}

interface BlockquoteHTMLAttributes extends GlobalHTMLAttributes {
  cite?: VNodePrimative;
}

interface CanvasHTMLAttributes extends GlobalHTMLAttributes {
  height?: VNodePrimative;
  width?: VNodePrimative;
}

interface ColHTMLAttributes extends GlobalHTMLAttributes {
  span?: VNodePrimative<number>;
  width?: VNodePrimative;
}

interface ColgroupHTMLAttributes extends GlobalHTMLAttributes {
  span?: VNodePrimative<number>;
}

interface DataHTMLAttributes extends GlobalHTMLAttributes {
  value?: VNodePrimative;
}

interface DetailsHTMLAttributes extends GlobalHTMLAttributes {
  open?: VNodePrimative<boolean>;
}

interface DialogHTMLAttributes extends GlobalHTMLAttributes {
  open?: VNodePrimative<boolean>;
}

interface EmbedHTMLAttributes extends GlobalHTMLAttributes {
  height?: VNodePrimative;
  src?: VNodePrimative;
  type?: VNodePrimative;
  width?: VNodePrimative;
}

interface FieldsetHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: VNodePrimative<boolean>;
  form?: VNodePrimative;
  name?: VNodePrimative;
}

interface FormHTMLAttributes extends GlobalHTMLAttributes {
  acceptCharset?: VNodePrimative;
  action?: VNodePrimative;
  autocomplete?: VNodePrimative<"on" | "off">;
  enctype?: VNodePrimative<
    "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain"
  >;
  method?: VNodePrimative<"get" | "post">;
  name?: VNodePrimative;
  novalidate?: VNodePrimative<boolean>;
  target?: VNodePrimative;
  rel?: VNodePrimative;
}

interface HtmlHTMLAttributes extends GlobalHTMLAttributes {
  xmlns?: VNodePrimative;
}

interface IframeHTMLAttributes extends GlobalHTMLAttributes {
  allow?: VNodePrimative;
  allowfullscreen?: VNodePrimative<boolean>;
  height?: VNodePrimative;
  loading?: VNodePrimative<"eager" | "lazy">;
  name?: VNodePrimative;
  referrerpolicy?: VNodePrimative;
  sandbox?: VNodePrimative;
  src?: VNodePrimative;
  srcdoc?: VNodePrimative;
  width?: VNodePrimative;
}

interface ImgHTMLAttributes extends GlobalHTMLAttributes {
  alt?: VNodePrimative;
  crossorigin?: VNodePrimative<"anonymous" | "use-credentials">;
  decoding?: VNodePrimative<"sync" | "async" | "auto">;
  height?: VNodePrimative;
  ismap?: VNodePrimative<boolean>;
  loading?: VNodePrimative<"eager" | "lazy">;
  referrerpolicy?: VNodePrimative;
  sizes?: VNodePrimative;
  src?: VNodePrimative;
  srcset?: VNodePrimative;
  usemap?: VNodePrimative;
  width?: VNodePrimative;
}

interface LabelHTMLAttributes extends GlobalHTMLAttributes {
  for?: VNodePrimative;
  form?: VNodePrimative;
}

interface LiHTMLAttributes extends GlobalHTMLAttributes {
  value?: VNodePrimative<number>;
}

interface LinkHTMLAttributes extends GlobalHTMLAttributes {
  as?: VNodePrimative;
  crossorigin?: VNodePrimative<"anonymous" | "use-credentials">;
  href?: VNodePrimative;
  hreflang?: VNodePrimative;
  media?: VNodePrimative;
  rel?: VNodePrimative;
  sizes?: VNodePrimative;
  type?: VNodePrimative;
}

interface MapHTMLAttributes extends GlobalHTMLAttributes {
  name?: VNodePrimative;
}

interface MetaHTMLAttributes extends GlobalHTMLAttributes {
  charset?: VNodePrimative;
  content?: VNodePrimative;
  httpEquiv?: VNodePrimative;
  name?: VNodePrimative;
}

interface MeterHTMLAttributes extends GlobalHTMLAttributes {
  form?: VNodePrimative;
  high?: VNodePrimative<number>;
  low?: VNodePrimative<number>;
  max?: VNodePrimative<number>;
  min?: VNodePrimative<number>;
  optimum?: VNodePrimative<number>;
  value?: VNodePrimative<number>;
}

interface ObjectHTMLAttributes extends GlobalHTMLAttributes {
  objectData?: VNodePrimative;
  form?: VNodePrimative;
  height?: VNodePrimative;
  name?: VNodePrimative;
  type?: VNodePrimative;
  usemap?: VNodePrimative;
  width?: VNodePrimative;
}

interface OlHTMLAttributes extends GlobalHTMLAttributes {
  reversed?: VNodePrimative<boolean>;
  start?: VNodePrimative<number>;
  type?: VNodePrimative<"1" | "a" | "A" | "i" | "I">;
}

interface OptgroupHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: VNodePrimative<boolean>;
  label?: VNodePrimative;
}

interface OptionHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: VNodePrimative<boolean>;
  label?: VNodePrimative;
  selected?: VNodePrimative<boolean>;
  value?: VNodePrimative;
}

interface OutputHTMLAttributes extends GlobalHTMLAttributes {
  for?: VNodePrimative;
  form?: VNodePrimative;
  name?: VNodePrimative;
}

interface ProgressHTMLAttributes extends GlobalHTMLAttributes {
  max?: VNodePrimative<number>;
  value?: VNodePrimative<number>;
}

interface ScriptHTMLAttributes extends GlobalHTMLAttributes {
  async?: VNodePrimative<boolean>;
  crossorigin?: VNodePrimative<"anonymous" | "use-credentials">;
  defer?: VNodePrimative<boolean>;
  integrity?: VNodePrimative;
  nomodule?: VNodePrimative<boolean>;
  nonce?: VNodePrimative;
  src?: VNodePrimative;
  type?: VNodePrimative;
}

interface SelectHTMLAttributes extends GlobalHTMLAttributes {
  autocomplete?: VNodePrimative;
  autofocus?: VNodePrimative<boolean>;
  disabled?: VNodePrimative<boolean>;
  form?: VNodePrimative;
  multiple?: VNodePrimative<boolean>;
  name?: VNodePrimative;
  required?: VNodePrimative<boolean>;
  size?: VNodePrimative<number>;
  value?: VNodePrimative;
}

interface SourceHTMLAttributes extends GlobalHTMLAttributes {
  media?: VNodePrimative;
  sizes?: VNodePrimative;
  src?: VNodePrimative;
  srcset?: VNodePrimative;
  type?: VNodePrimative;
}

interface StyleHTMLAttributes extends GlobalHTMLAttributes {
  media?: VNodePrimative;
  nonce?: VNodePrimative;
  scoped?: VNodePrimative<boolean>;
  type?: VNodePrimative;
}

interface TableHTMLAttributes extends GlobalHTMLAttributes {
  cellPadding?: VNodePrimative;
  cellSpacing?: VNodePrimative;
  summary?: VNodePrimative;
}

interface TextareaHTMLAttributes extends GlobalHTMLAttributes {
  autocomplete?: VNodePrimative;
  autofocus?: VNodePrimative<boolean>;
  cols?: VNodePrimative<number>;
  dirname?: VNodePrimative;
  disabled?: VNodePrimative<boolean>;
  form?: VNodePrimative;
  maxlength?: VNodePrimative<number>;
  minlength?: VNodePrimative<number>;
  name?: VNodePrimative;
  placeholder?: VNodePrimative;
  readonly?: VNodePrimative<boolean>;
  required?: VNodePrimative<boolean>;
  rows?: VNodePrimative<number>;
  value?: VNodePrimative;
  wrap?: VNodePrimative<"hard" | "soft">;
}

interface TdHTMLAttributes extends GlobalHTMLAttributes {
  colspan?: VNodePrimative<number>;
  headers?: VNodePrimative;
  rowspan?: VNodePrimative<number>;
}

interface ThHTMLAttributes extends GlobalHTMLAttributes {
  colspan?: VNodePrimative<number>;
  headers?: VNodePrimative;
  rowspan?: VNodePrimative<number>;
  scope?: VNodePrimative<"col" | "row" | "rowgroup" | "colgroup">;
}

interface TimeHTMLAttributes extends GlobalHTMLAttributes {
  datetime?: VNodePrimative;
}

interface TrackHTMLAttributes extends GlobalHTMLAttributes {
  default?: VNodePrimative<boolean>;
  kind?: VNodePrimative<
    "subtitles" | "captions" | "descriptions" | "chapters" | "metadata"
  >;
  label?: VNodePrimative;
  src?: VNodePrimative;
  srclang?: VNodePrimative;
}

interface VideoHTMLAttributes extends GlobalHTMLAttributes {
  autoplay?: VNodePrimative<boolean>;
  controls?: VNodePrimative<boolean>;
  crossorigin?: VNodePrimative<"anonymous" | "use-credentials">;
  height?: VNodePrimative;
  loop?: VNodePrimative<boolean>;
  muted?: VNodePrimative<boolean>;
  playsinline?: VNodePrimative<boolean>;
  poster?: VNodePrimative;
  preload?: VNodePrimative<"none" | "metadata" | "auto">;
  src?: VNodePrimative;
  width?: VNodePrimative;
}

// Define interfaces for other elements that only use global attributes
interface DivHTMLAttributes extends GlobalHTMLAttributes { }
interface SpanHTMLAttributes extends GlobalHTMLAttributes { }
interface ParagraphHTMLAttributes extends GlobalHTMLAttributes { }
interface HeaderHTMLAttributes extends GlobalHTMLAttributes { }
interface FooterHTMLAttributes extends GlobalHTMLAttributes { }
interface MainHTMLAttributes extends GlobalHTMLAttributes { }
interface SectionHTMLAttributes extends GlobalHTMLAttributes { }
interface ArticleHTMLAttributes extends GlobalHTMLAttributes { }
interface AsideHTMLAttributes extends GlobalHTMLAttributes { }
interface NavHTMLAttributes extends GlobalHTMLAttributes { }
interface HeadingHTMLAttributes extends GlobalHTMLAttributes { }
interface HrHTMLAttributes extends GlobalHTMLAttributes { }
interface BrHTMLAttributes extends GlobalHTMLAttributes { }
interface UlHTMLAttributes extends GlobalHTMLAttributes { }

/**
 * Map of HTML tag names to their specific attribute interfaces.
 */
export interface HTMLAttributeMap {
  a: AnchorHTMLAttributes;
  abbr: GlobalHTMLAttributes;
  address: GlobalHTMLAttributes;
  area: AreaHTMLAttributes;
  article: ArticleHTMLAttributes;
  aside: AsideHTMLAttributes;
  audio: AudioHTMLAttributes;
  b: GlobalHTMLAttributes;
  base: BaseHTMLAttributes;
  bdi: GlobalHTMLAttributes;
  bdo: GlobalHTMLAttributes;
  blockquote: BlockquoteHTMLAttributes;
  body: GlobalHTMLAttributes;
  br: BrHTMLAttributes;
  button: ButtonHTMLAttributes;
  canvas: CanvasHTMLAttributes;
  caption: GlobalHTMLAttributes;
  cite: GlobalHTMLAttributes;
  code: GlobalHTMLAttributes;
  col: ColHTMLAttributes;
  colgroup: ColgroupHTMLAttributes;
  data: DataHTMLAttributes;
  datalist: GlobalHTMLAttributes;
  dd: GlobalHTMLAttributes;
  del: GlobalHTMLAttributes;
  details: DetailsHTMLAttributes;
  dfn: GlobalHTMLAttributes;
  dialog: DialogHTMLAttributes;
  div: DivHTMLAttributes;
  dl: GlobalHTMLAttributes;
  dt: GlobalHTMLAttributes;
  em: GlobalHTMLAttributes;
  embed: EmbedHTMLAttributes;
  fieldset: FieldsetHTMLAttributes;
  figcaption: GlobalHTMLAttributes;
  figure: GlobalHTMLAttributes;
  footer: FooterHTMLAttributes;
  form: FormHTMLAttributes;
  h1: HeadingHTMLAttributes;
  h2: HeadingHTMLAttributes;
  h3: HeadingHTMLAttributes;
  h4: HeadingHTMLAttributes;
  h5: HeadingHTMLAttributes;
  h6: HeadingHTMLAttributes;
  head: GlobalHTMLAttributes;
  header: HeaderHTMLAttributes;
  hgroup: GlobalHTMLAttributes;
  hr: HrHTMLAttributes;
  html: HtmlHTMLAttributes;
  i: GlobalHTMLAttributes;
  iframe: IframeHTMLAttributes;
  img: ImgHTMLAttributes;
  input: InputHTMLAttributes;
  ins: GlobalHTMLAttributes;
  kbd: GlobalHTMLAttributes;
  label: LabelHTMLAttributes;
  legend: GlobalHTMLAttributes;
  li: LiHTMLAttributes;
  link: LinkHTMLAttributes;
  main: MainHTMLAttributes;
  map: MapHTMLAttributes;
  mark: GlobalHTMLAttributes;
  menu: GlobalHTMLAttributes;
  meta: MetaHTMLAttributes;
  meter: MeterHTMLAttributes;
  nav: NavHTMLAttributes;
  noscript: GlobalHTMLAttributes;
  object: ObjectHTMLAttributes;
  ol: OlHTMLAttributes;
  optgroup: OptgroupHTMLAttributes;
  option: OptionHTMLAttributes;
  output: OutputHTMLAttributes;
  p: ParagraphHTMLAttributes;
  param: GlobalHTMLAttributes;
  picture: GlobalHTMLAttributes;
  pre: GlobalHTMLAttributes;
  progress: ProgressHTMLAttributes;
  q: GlobalHTMLAttributes;
  rp: GlobalHTMLAttributes;
  rt: GlobalHTMLAttributes;
  ruby: GlobalHTMLAttributes;
  s: GlobalHTMLAttributes;
  samp: GlobalHTMLAttributes;
  script: ScriptHTMLAttributes;
  section: SectionHTMLAttributes;
  select: SelectHTMLAttributes;
  small: GlobalHTMLAttributes;
  source: SourceHTMLAttributes;
  span: SpanHTMLAttributes;
  strong: GlobalHTMLAttributes;
  style: StyleHTMLAttributes;
  sub: GlobalHTMLAttributes;
  summary: GlobalHTMLAttributes;
  sup: GlobalHTMLAttributes;
  table: TableHTMLAttributes;
  tbody: GlobalHTMLAttributes;
  td: TdHTMLAttributes;
  template: GlobalHTMLAttributes;
  textarea: TextareaHTMLAttributes;
  tfoot: GlobalHTMLAttributes;
  th: ThHTMLAttributes;
  thead: GlobalHTMLAttributes;
  time: TimeHTMLAttributes;
  title: GlobalHTMLAttributes;
  tr: GlobalHTMLAttributes;
  track: TrackHTMLAttributes;
  u: GlobalHTMLAttributes;
  ul: UlHTMLAttributes;
  var: GlobalHTMLAttributes;
  video: VideoHTMLAttributes;
  wbr: GlobalHTMLAttributes;
  // Default fallback
  [tag: string]: GlobalHTMLAttributes;
}

/**
 * Utility type to get attributes for a specific element.
 * @template K
 */
export type HTMLAttributes<K extends keyof HTMLAttributeMap> =
  HTMLAttributeMap[K];
