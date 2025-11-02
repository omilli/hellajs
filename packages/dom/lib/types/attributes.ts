/**
 * A type that can either be the raw value or a Signal containing that value.
 * @template T
 */
import type { HellaPrimitive } from "./nodes";

/**
 * Event handler mapping for DOM events
 */
export type DOMEventMap = {
  click: MouseEvent;
  dblclick: MouseEvent;
  mousedown: MouseEvent;
  mouseup: MouseEvent;
  mouseover: MouseEvent;
  mousemove: MouseEvent;
  mouseout: MouseEvent;
  mouseenter: MouseEvent;
  mouseleave: MouseEvent;
  keypress: KeyboardEvent;
  keydown: KeyboardEvent;
  keyup: KeyboardEvent;
  focus: FocusEvent;
  blur: FocusEvent;
  change: Event;
  submit: SubmitEvent;
  reset: Event;
  input: InputEvent;
  select: Event;
  load: Event;
  error: Event;
  scroll: Event;
  resize: Event;
  contextmenu: MouseEvent;
  wheel: WheelEvent;
  drag: DragEvent;
  dragstart: DragEvent;
  dragend: DragEvent;
  dragover: DragEvent;
  dragenter: DragEvent;
  dragleave: DragEvent;
  drop: DragEvent;
  touchstart: TouchEvent;
  touchmove: TouchEvent;
  touchend: TouchEvent;
  touchcancel: TouchEvent;
};

/**
 * Capitalize first letter of string
 */
type Capitalize<S extends string> = S extends `${infer T}${infer U}` ? `${Uppercase<T>}${U}` : S;

/**
 * Generate event handler types for both camelCase and lowercase variants
 */
type EventHandlers = {
  [K in keyof DOMEventMap as `on${K}`]?: K extends 'error'
  ? string | ((this: HTMLElement, event: DOMEventMap[K]) => void)
  : (this: HTMLElement, event: DOMEventMap[K]) => void;
} & {
  [K in keyof DOMEventMap as `on${Capitalize<K>}`]?: K extends 'error'
  ? string | ((this: HTMLElement, event: DOMEventMap[K]) => void)
  : (this: HTMLElement, event: DOMEventMap[K]) => void;
};

/**
 * Global HTML attributes that apply to all elements.
 */
export interface GlobalHTMLAttributes extends EventHandlers {
  id?: HellaPrimitive;
  class?: HellaPrimitive | string[];
  style?: HellaPrimitive;
  title?: HellaPrimitive;
  tabindex?: HellaPrimitive<number>;
  hidden?: HellaPrimitive<boolean>;
  draggable?: HellaPrimitive<boolean>;
  dir?: HellaPrimitive<"ltr" | "rtl" | "auto">;
  lang?: HellaPrimitive;
  slot?: HellaPrimitive;
  for?: HellaPrimitive;
  accesskey?: HellaPrimitive;
  contenteditable?: HellaPrimitive<boolean | "true" | "false">;
  // HTML5 custom data attributes (data-*)
  [key: `data-${string}`]: HellaPrimitive;

  // ARIA attributes
  role?: HellaPrimitive;
  "aria-label"?: HellaPrimitive;
  "aria-labelledby"?: HellaPrimitive;
  "aria-describedby"?: HellaPrimitive;
  "aria-atomic"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-autocomplete"?: HellaPrimitive<"none" | "inline" | "list" | "both">;
  "aria-busy"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-checked"?: HellaPrimitive<boolean | "true" | "false" | "mixed">;
  "aria-colcount"?: HellaPrimitive<number>;
  "aria-colindex"?: HellaPrimitive<number>;
  "aria-colspan"?: HellaPrimitive<number>;
  "aria-controls"?: HellaPrimitive;
  "aria-current"?: HellaPrimitive<boolean | "true" | "false" | "page" | "step" | "location" | "date" | "time">;
  "aria-disabled"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-expanded"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-haspopup"?: HellaPrimitive<boolean | "true" | "false" | "menu" | "listbox" | "tree" | "grid" | "dialog">;
  "aria-hidden"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-invalid"?: HellaPrimitive<boolean | "true" | "false" | "grammar" | "spelling">;
  "aria-keyshortcuts"?: HellaPrimitive;
  "aria-level"?: HellaPrimitive<number>;
  "aria-live"?: HellaPrimitive<"off" | "assertive" | "polite">;
  "aria-modal"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-multiline"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-multiselectable"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-orientation"?: HellaPrimitive<"horizontal" | "vertical">;
  "aria-owns"?: HellaPrimitive;
  "aria-placeholder"?: HellaPrimitive;
  "aria-posinset"?: HellaPrimitive<number>;
  "aria-pressed"?: HellaPrimitive<boolean | "true" | "false" | "mixed">;
  "aria-readonly"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-required"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-roledescription"?: HellaPrimitive;
  "aria-rowcount"?: HellaPrimitive<number>;
  "aria-rowindex"?: HellaPrimitive<number>;
  "aria-rowspan"?: HellaPrimitive<number>;
  "aria-selected"?: HellaPrimitive<boolean | "true" | "false">;
  "aria-setsize"?: HellaPrimitive<number>;
  "aria-sort"?: HellaPrimitive<"none" | "ascending" | "descending" | "other">;
  "aria-valuemax"?: HellaPrimitive<number>;
  "aria-valuemin"?: HellaPrimitive<number>;
  "aria-valuenow"?: HellaPrimitive<number>;
  "aria-valuetext"?: HellaPrimitive;

  // Add index signature to allow arbitrary string keys
  [key: string]: unknown;

}

// Element-specific attributes
interface AnchorHTMLAttributes extends GlobalHTMLAttributes {
  href?: HellaPrimitive;
  target?: HellaPrimitive<"_blank" | "_self" | "_parent" | "_top">;
  rel?: HellaPrimitive;
  download?: unknown;
  hreflang?: HellaPrimitive;
  type?: HellaPrimitive;
  referrerpolicy?: HellaPrimitive<
    "no-referrer" |
    "no-referrer-when-downgrade" |
    "origin" |
    "origin-when-cross-origin" |
    "unsafe-url"
  >;
  ping?: HellaPrimitive;
}

interface ButtonHTMLAttributes extends GlobalHTMLAttributes {
  type?: HellaPrimitive<"button" | "submit" | "reset">;
  disabled?: HellaPrimitive<boolean>;
  form?: HellaPrimitive;
  formaction?: HellaPrimitive;
  formenctype?: HellaPrimitive;
  formmethod?: HellaPrimitive;
  formnovalidate?: HellaPrimitive<boolean>;
  formtarget?: HellaPrimitive;
  name?: HellaPrimitive;
  value?: HellaPrimitive;
  autofocus?: HellaPrimitive<boolean>;
}

interface InputHTMLAttributes extends GlobalHTMLAttributes {
  type?: HellaPrimitive<
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
    "HellaPrimitive<number>" |
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
  name?: HellaPrimitive;
  value?: HellaPrimitive;
  disabled?: HellaPrimitive<boolean>;
  checked?: HellaPrimitive<boolean>;
  placeholder?: HellaPrimitive;
  readOnly?: HellaPrimitive<boolean>;
  required?: HellaPrimitive<boolean>;
  min?: HellaPrimitive;
  max?: HellaPrimitive;
  step?: HellaPrimitive;
  pattern?: HellaPrimitive;
  accept?: HellaPrimitive;
  autocomplete?: HellaPrimitive;
  autofocus?: HellaPrimitive<boolean>;
  capture?: HellaPrimitive<boolean | "user" | "environment">;
  dirname?: HellaPrimitive;
  form?: HellaPrimitive;
  formaction?: HellaPrimitive;
  formenctype?: HellaPrimitive;
  formmethod?: HellaPrimitive;
  formnovalidate?: HellaPrimitive<boolean>;
  formtarget?: HellaPrimitive;
  height?: HellaPrimitive;
  list?: HellaPrimitive;
  maxlength?: HellaPrimitive<number>;
  minlength?: HellaPrimitive<number>;
  multiple?: HellaPrimitive<boolean>;
  size?: HellaPrimitive<number>;
  src?: HellaPrimitive;
  width?: HellaPrimitive;
}

// Additional HTML element interfaces

interface AreaHTMLAttributes extends GlobalHTMLAttributes {
  alt?: HellaPrimitive;
  coords?: HellaPrimitive;
  download?: unknown;
  href?: HellaPrimitive;
  hreflang?: HellaPrimitive;
  media?: HellaPrimitive;
  referrerpolicy?: HellaPrimitive;
  rel?: HellaPrimitive;
  shape?: HellaPrimitive<"rect" | "circle" | "poly" | "default">;
  target?: HellaPrimitive;
  type?: HellaPrimitive;
}

interface AudioHTMLAttributes extends GlobalHTMLAttributes {
  autoplay?: HellaPrimitive<boolean>;
  controls?: HellaPrimitive<boolean>;
  crossorigin?: HellaPrimitive<"anonymous" | "use-credentials">;
  loop?: HellaPrimitive<boolean>;
  muted?: HellaPrimitive<boolean>;
  preload?: HellaPrimitive<"none" | "metadata" | "auto">;
  src?: HellaPrimitive;
}

interface BaseHTMLAttributes extends GlobalHTMLAttributes {
  href?: HellaPrimitive;
  target?: HellaPrimitive;
}

interface BlockquoteHTMLAttributes extends GlobalHTMLAttributes {
  cite?: HellaPrimitive;
}

interface CanvasHTMLAttributes extends GlobalHTMLAttributes {
  height?: HellaPrimitive;
  width?: HellaPrimitive;
}

interface ColHTMLAttributes extends GlobalHTMLAttributes {
  span?: HellaPrimitive<number>;
  width?: HellaPrimitive;
}

interface ColgroupHTMLAttributes extends GlobalHTMLAttributes {
  span?: HellaPrimitive<number>;
}

interface DataHTMLAttributes extends GlobalHTMLAttributes {
  value?: HellaPrimitive;
}

interface DetailsHTMLAttributes extends GlobalHTMLAttributes {
  open?: HellaPrimitive<boolean>;
}

interface DialogHTMLAttributes extends GlobalHTMLAttributes {
  open?: HellaPrimitive<boolean>;
}

interface EmbedHTMLAttributes extends GlobalHTMLAttributes {
  height?: HellaPrimitive;
  src?: HellaPrimitive;
  type?: HellaPrimitive;
  width?: HellaPrimitive;
}

interface FieldsetHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: HellaPrimitive<boolean>;
  form?: HellaPrimitive;
  name?: HellaPrimitive;
}

interface FormHTMLAttributes extends GlobalHTMLAttributes {
  acceptCharset?: HellaPrimitive;
  action?: HellaPrimitive;
  autocomplete?: HellaPrimitive<"on" | "off">;
  enctype?: HellaPrimitive<
    "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain"
  >;
  method?: HellaPrimitive<"get" | "post">;
  name?: HellaPrimitive;
  novalidate?: HellaPrimitive<boolean>;
  target?: HellaPrimitive;
  rel?: HellaPrimitive;
}

interface HtmlHTMLAttributes extends GlobalHTMLAttributes {
  xmlns?: HellaPrimitive;
}

interface IframeHTMLAttributes extends GlobalHTMLAttributes {
  allow?: HellaPrimitive;
  allowfullscreen?: HellaPrimitive<boolean>;
  height?: HellaPrimitive;
  loading?: HellaPrimitive<"eager" | "lazy">;
  name?: HellaPrimitive;
  referrerpolicy?: HellaPrimitive;
  sandbox?: HellaPrimitive;
  src?: HellaPrimitive;
  srcdoc?: HellaPrimitive;
  width?: HellaPrimitive;
}

interface ImgHTMLAttributes extends GlobalHTMLAttributes {
  alt?: HellaPrimitive;
  crossorigin?: HellaPrimitive<"anonymous" | "use-credentials">;
  decoding?: HellaPrimitive<"sync" | "async" | "auto">;
  height?: HellaPrimitive;
  ismap?: HellaPrimitive<boolean>;
  loading?: HellaPrimitive<"eager" | "lazy">;
  referrerpolicy?: HellaPrimitive;
  sizes?: HellaPrimitive;
  src?: HellaPrimitive;
  srcset?: HellaPrimitive;
  usemap?: HellaPrimitive;
  width?: HellaPrimitive;
}

interface LabelHTMLAttributes extends GlobalHTMLAttributes {
  for?: HellaPrimitive;
  form?: HellaPrimitive;
}

interface LiHTMLAttributes extends GlobalHTMLAttributes {
  value?: HellaPrimitive<number>;
}

interface LinkHTMLAttributes extends GlobalHTMLAttributes {
  as?: HellaPrimitive;
  crossorigin?: HellaPrimitive<"anonymous" | "use-credentials">;
  href?: HellaPrimitive;
  hreflang?: HellaPrimitive;
  media?: HellaPrimitive;
  rel?: HellaPrimitive;
  sizes?: HellaPrimitive;
  type?: HellaPrimitive;
}

interface MapHTMLAttributes extends GlobalHTMLAttributes {
  name?: HellaPrimitive;
}

interface MetaHTMLAttributes extends GlobalHTMLAttributes {
  charset?: HellaPrimitive;
  content?: HellaPrimitive;
  httpEquiv?: HellaPrimitive;
  name?: HellaPrimitive;
}

interface MeterHTMLAttributes extends GlobalHTMLAttributes {
  form?: HellaPrimitive;
  high?: HellaPrimitive<number>;
  low?: HellaPrimitive<number>;
  max?: HellaPrimitive<number>;
  min?: HellaPrimitive<number>;
  optimum?: HellaPrimitive<number>;
  value?: HellaPrimitive<number>;
}

interface ObjectHTMLAttributes extends GlobalHTMLAttributes {
  objectData?: HellaPrimitive;
  form?: HellaPrimitive;
  height?: HellaPrimitive;
  name?: HellaPrimitive;
  type?: HellaPrimitive;
  usemap?: HellaPrimitive;
  width?: HellaPrimitive;
}

interface OlHTMLAttributes extends GlobalHTMLAttributes {
  reversed?: HellaPrimitive<boolean>;
  start?: HellaPrimitive<number>;
  type?: HellaPrimitive<"1" | "a" | "A" | "i" | "I">;
}

interface OptgroupHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: HellaPrimitive<boolean>;
  label?: HellaPrimitive;
}

interface OptionHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: HellaPrimitive<boolean>;
  label?: HellaPrimitive;
  selected?: HellaPrimitive<boolean>;
  value?: HellaPrimitive;
}

interface OutputHTMLAttributes extends GlobalHTMLAttributes {
  for?: HellaPrimitive;
  form?: HellaPrimitive;
  name?: HellaPrimitive;
}

interface ProgressHTMLAttributes extends GlobalHTMLAttributes {
  max?: HellaPrimitive<number>;
  value?: HellaPrimitive<number>;
}

interface ScriptHTMLAttributes extends GlobalHTMLAttributes {
  async?: HellaPrimitive<boolean>;
  crossorigin?: HellaPrimitive<"anonymous" | "use-credentials">;
  defer?: HellaPrimitive<boolean>;
  integrity?: HellaPrimitive;
  nomodule?: HellaPrimitive<boolean>;
  nonce?: HellaPrimitive;
  src?: HellaPrimitive;
  type?: HellaPrimitive;
}

interface SelectHTMLAttributes extends GlobalHTMLAttributes {
  autocomplete?: HellaPrimitive;
  autofocus?: HellaPrimitive<boolean>;
  disabled?: HellaPrimitive<boolean>;
  form?: HellaPrimitive;
  multiple?: HellaPrimitive<boolean>;
  name?: HellaPrimitive;
  required?: HellaPrimitive<boolean>;
  size?: HellaPrimitive<number>;
  value?: HellaPrimitive;
}

interface SourceHTMLAttributes extends GlobalHTMLAttributes {
  media?: HellaPrimitive;
  sizes?: HellaPrimitive;
  src?: HellaPrimitive;
  srcset?: HellaPrimitive;
  type?: HellaPrimitive;
}

interface StyleHTMLAttributes extends GlobalHTMLAttributes {
  media?: HellaPrimitive;
  nonce?: HellaPrimitive;
  scoped?: HellaPrimitive<boolean>;
  type?: HellaPrimitive;
}

interface TableHTMLAttributes extends GlobalHTMLAttributes {
  cellPadding?: HellaPrimitive;
  cellSpacing?: HellaPrimitive;
  summary?: HellaPrimitive;
}

interface TextareaHTMLAttributes extends GlobalHTMLAttributes {
  autocomplete?: HellaPrimitive;
  autofocus?: HellaPrimitive<boolean>;
  cols?: HellaPrimitive<number>;
  dirname?: HellaPrimitive;
  disabled?: HellaPrimitive<boolean>;
  form?: HellaPrimitive;
  maxlength?: HellaPrimitive<number>;
  minlength?: HellaPrimitive<number>;
  name?: HellaPrimitive;
  placeholder?: HellaPrimitive;
  readonly?: HellaPrimitive<boolean>;
  required?: HellaPrimitive<boolean>;
  rows?: HellaPrimitive<number>;
  value?: HellaPrimitive;
  wrap?: HellaPrimitive<"hard" | "soft">;
}

interface TdHTMLAttributes extends GlobalHTMLAttributes {
  colspan?: HellaPrimitive<number>;
  headers?: HellaPrimitive;
  rowspan?: HellaPrimitive<number>;
}

interface ThHTMLAttributes extends GlobalHTMLAttributes {
  colspan?: HellaPrimitive<number>;
  headers?: HellaPrimitive;
  rowspan?: HellaPrimitive<number>;
  scope?: HellaPrimitive<"col" | "row" | "rowgroup" | "colgroup">;
}

interface TimeHTMLAttributes extends GlobalHTMLAttributes {
  datetime?: HellaPrimitive;
}

interface TrackHTMLAttributes extends GlobalHTMLAttributes {
  default?: HellaPrimitive<boolean>;
  kind?: HellaPrimitive<
    "subtitles" | "captions" | "descriptions" | "chapters" | "metadata"
  >;
  label?: HellaPrimitive;
  src?: HellaPrimitive;
  srclang?: HellaPrimitive;
}

interface VideoHTMLAttributes extends GlobalHTMLAttributes {
  autoplay?: HellaPrimitive<boolean>;
  controls?: HellaPrimitive<boolean>;
  crossorigin?: HellaPrimitive<"anonymous" | "use-credentials">;
  height?: HellaPrimitive;
  loop?: HellaPrimitive<boolean>;
  muted?: HellaPrimitive<boolean>;
  playsinline?: HellaPrimitive<boolean>;
  poster?: HellaPrimitive;
  preload?: HellaPrimitive<"none" | "metadata" | "auto">;
  src?: HellaPrimitive;
  width?: HellaPrimitive;
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
