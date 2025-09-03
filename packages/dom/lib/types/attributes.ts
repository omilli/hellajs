/**
 * A type that can either be the raw value or a Signal containing that value.
 * @template T
 */
import type { HellaPrimative } from "./nodes";

/**
 * Event handler mapping for DOM events
 */
type DOMEventMap = {
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
  id?: HellaPrimative;
  class?: HellaPrimative | string[];
  style?: HellaPrimative;
  title?: HellaPrimative;
  tabindex?: HellaPrimative<number>;
  hidden?: HellaPrimative<boolean>;
  draggable?: HellaPrimative<boolean>;
  dir?: HellaPrimative<"ltr" | "rtl" | "auto">;
  lang?: HellaPrimative;
  slot?: HellaPrimative;
  for?: HellaPrimative;
  accesskey?: HellaPrimative;
  contenteditable?: HellaPrimative<boolean | "true" | "false">;
  // HTML5 custom data attributes (data-*)
  [key: `data-${string}`]: HellaPrimative;

  // ARIA attributes
  role?: HellaPrimative;
  "aria-label"?: HellaPrimative;
  "aria-labelledby"?: HellaPrimative;
  "aria-describedby"?: HellaPrimative;
  "aria-atomic"?: HellaPrimative<boolean | "true" | "false">;
  "aria-autocomplete"?: HellaPrimative<"none" | "inline" | "list" | "both">;
  "aria-busy"?: HellaPrimative<boolean | "true" | "false">;
  "aria-checked"?: HellaPrimative<boolean | "true" | "false" | "mixed">;
  "aria-colcount"?: HellaPrimative<number>;
  "aria-colindex"?: HellaPrimative<number>;
  "aria-colspan"?: HellaPrimative<number>;
  "aria-controls"?: HellaPrimative;
  "aria-current"?: HellaPrimative<boolean | "true" | "false" | "page" | "step" | "location" | "date" | "time">;
  "aria-disabled"?: HellaPrimative<boolean | "true" | "false">;
  "aria-expanded"?: HellaPrimative<boolean | "true" | "false">;
  "aria-haspopup"?: HellaPrimative<boolean | "true" | "false" | "menu" | "listbox" | "tree" | "grid" | "dialog">;
  "aria-hidden"?: HellaPrimative<boolean | "true" | "false">;
  "aria-invalid"?: HellaPrimative<boolean | "true" | "false" | "grammar" | "spelling">;
  "aria-keyshortcuts"?: HellaPrimative;
  "aria-level"?: HellaPrimative<number>;
  "aria-live"?: HellaPrimative<"off" | "assertive" | "polite">;
  "aria-modal"?: HellaPrimative<boolean | "true" | "false">;
  "aria-multiline"?: HellaPrimative<boolean | "true" | "false">;
  "aria-multiselectable"?: HellaPrimative<boolean | "true" | "false">;
  "aria-orientation"?: HellaPrimative<"horizontal" | "vertical">;
  "aria-owns"?: HellaPrimative;
  "aria-placeholder"?: HellaPrimative;
  "aria-posinset"?: HellaPrimative<number>;
  "aria-pressed"?: HellaPrimative<boolean | "true" | "false" | "mixed">;
  "aria-readonly"?: HellaPrimative<boolean | "true" | "false">;
  "aria-required"?: HellaPrimative<boolean | "true" | "false">;
  "aria-roledescription"?: HellaPrimative;
  "aria-rowcount"?: HellaPrimative<number>;
  "aria-rowindex"?: HellaPrimative<number>;
  "aria-rowspan"?: HellaPrimative<number>;
  "aria-selected"?: HellaPrimative<boolean | "true" | "false">;
  "aria-setsize"?: HellaPrimative<number>;
  "aria-sort"?: HellaPrimative<"none" | "ascending" | "descending" | "other">;
  "aria-valuemax"?: HellaPrimative<number>;
  "aria-valuemin"?: HellaPrimative<number>;
  "aria-valuenow"?: HellaPrimative<number>;
  "aria-valuetext"?: HellaPrimative;

  // Add index signature to allow arbitrary string keys
  [key: string]: unknown;

}

// Element-specific attributes
interface AnchorHTMLAttributes extends GlobalHTMLAttributes {
  href?: HellaPrimative;
  target?: HellaPrimative<"_blank" | "_self" | "_parent" | "_top">;
  rel?: HellaPrimative;
  download?: unknown;
  hreflang?: HellaPrimative;
  type?: HellaPrimative;
  referrerpolicy?: HellaPrimative<
    "no-referrer" |
    "no-referrer-when-downgrade" |
    "origin" |
    "origin-when-cross-origin" |
    "unsafe-url"
  >;
  ping?: HellaPrimative;
}

interface ButtonHTMLAttributes extends GlobalHTMLAttributes {
  type?: HellaPrimative<"button" | "submit" | "reset">;
  disabled?: HellaPrimative<boolean>;
  form?: HellaPrimative;
  formaction?: HellaPrimative;
  formenctype?: HellaPrimative;
  formmethod?: HellaPrimative;
  formnovalidate?: HellaPrimative<boolean>;
  formtarget?: HellaPrimative;
  name?: HellaPrimative;
  value?: HellaPrimative;
  autofocus?: HellaPrimative<boolean>;
}

interface InputHTMLAttributes extends GlobalHTMLAttributes {
  type?: HellaPrimative<
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
    "HellaPrimative<number>" |
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
  name?: HellaPrimative;
  value?: HellaPrimative;
  disabled?: HellaPrimative<boolean>;
  checked?: HellaPrimative<boolean>;
  placeholder?: HellaPrimative;
  readOnly?: HellaPrimative<boolean>;
  required?: HellaPrimative<boolean>;
  min?: HellaPrimative;
  max?: HellaPrimative;
  step?: HellaPrimative;
  pattern?: HellaPrimative;
  accept?: HellaPrimative;
  autocomplete?: HellaPrimative;
  autofocus?: HellaPrimative<boolean>;
  capture?: HellaPrimative<boolean | "user" | "environment">;
  dirname?: HellaPrimative;
  form?: HellaPrimative;
  formaction?: HellaPrimative;
  formenctype?: HellaPrimative;
  formmethod?: HellaPrimative;
  formnovalidate?: HellaPrimative<boolean>;
  formtarget?: HellaPrimative;
  height?: HellaPrimative;
  list?: HellaPrimative;
  maxlength?: HellaPrimative<number>;
  minlength?: HellaPrimative<number>;
  multiple?: HellaPrimative<boolean>;
  size?: HellaPrimative<number>;
  src?: HellaPrimative;
  width?: HellaPrimative;
}

// Additional HTML element interfaces

interface AreaHTMLAttributes extends GlobalHTMLAttributes {
  alt?: HellaPrimative;
  coords?: HellaPrimative;
  download?: unknown;
  href?: HellaPrimative;
  hreflang?: HellaPrimative;
  media?: HellaPrimative;
  referrerpolicy?: HellaPrimative;
  rel?: HellaPrimative;
  shape?: HellaPrimative<"rect" | "circle" | "poly" | "default">;
  target?: HellaPrimative;
  type?: HellaPrimative;
}

interface AudioHTMLAttributes extends GlobalHTMLAttributes {
  autoplay?: HellaPrimative<boolean>;
  controls?: HellaPrimative<boolean>;
  crossorigin?: HellaPrimative<"anonymous" | "use-credentials">;
  loop?: HellaPrimative<boolean>;
  muted?: HellaPrimative<boolean>;
  preload?: HellaPrimative<"none" | "metadata" | "auto">;
  src?: HellaPrimative;
}

interface BaseHTMLAttributes extends GlobalHTMLAttributes {
  href?: HellaPrimative;
  target?: HellaPrimative;
}

interface BlockquoteHTMLAttributes extends GlobalHTMLAttributes {
  cite?: HellaPrimative;
}

interface CanvasHTMLAttributes extends GlobalHTMLAttributes {
  height?: HellaPrimative;
  width?: HellaPrimative;
}

interface ColHTMLAttributes extends GlobalHTMLAttributes {
  span?: HellaPrimative<number>;
  width?: HellaPrimative;
}

interface ColgroupHTMLAttributes extends GlobalHTMLAttributes {
  span?: HellaPrimative<number>;
}

interface DataHTMLAttributes extends GlobalHTMLAttributes {
  value?: HellaPrimative;
}

interface DetailsHTMLAttributes extends GlobalHTMLAttributes {
  open?: HellaPrimative<boolean>;
}

interface DialogHTMLAttributes extends GlobalHTMLAttributes {
  open?: HellaPrimative<boolean>;
}

interface EmbedHTMLAttributes extends GlobalHTMLAttributes {
  height?: HellaPrimative;
  src?: HellaPrimative;
  type?: HellaPrimative;
  width?: HellaPrimative;
}

interface FieldsetHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: HellaPrimative<boolean>;
  form?: HellaPrimative;
  name?: HellaPrimative;
}

interface FormHTMLAttributes extends GlobalHTMLAttributes {
  acceptCharset?: HellaPrimative;
  action?: HellaPrimative;
  autocomplete?: HellaPrimative<"on" | "off">;
  enctype?: HellaPrimative<
    "application/x-www-form-urlencoded" | "multipart/form-data" | "text/plain"
  >;
  method?: HellaPrimative<"get" | "post">;
  name?: HellaPrimative;
  novalidate?: HellaPrimative<boolean>;
  target?: HellaPrimative;
  rel?: HellaPrimative;
}

interface HtmlHTMLAttributes extends GlobalHTMLAttributes {
  xmlns?: HellaPrimative;
}

interface IframeHTMLAttributes extends GlobalHTMLAttributes {
  allow?: HellaPrimative;
  allowfullscreen?: HellaPrimative<boolean>;
  height?: HellaPrimative;
  loading?: HellaPrimative<"eager" | "lazy">;
  name?: HellaPrimative;
  referrerpolicy?: HellaPrimative;
  sandbox?: HellaPrimative;
  src?: HellaPrimative;
  srcdoc?: HellaPrimative;
  width?: HellaPrimative;
}

interface ImgHTMLAttributes extends GlobalHTMLAttributes {
  alt?: HellaPrimative;
  crossorigin?: HellaPrimative<"anonymous" | "use-credentials">;
  decoding?: HellaPrimative<"sync" | "async" | "auto">;
  height?: HellaPrimative;
  ismap?: HellaPrimative<boolean>;
  loading?: HellaPrimative<"eager" | "lazy">;
  referrerpolicy?: HellaPrimative;
  sizes?: HellaPrimative;
  src?: HellaPrimative;
  srcset?: HellaPrimative;
  usemap?: HellaPrimative;
  width?: HellaPrimative;
}

interface LabelHTMLAttributes extends GlobalHTMLAttributes {
  for?: HellaPrimative;
  form?: HellaPrimative;
}

interface LiHTMLAttributes extends GlobalHTMLAttributes {
  value?: HellaPrimative<number>;
}

interface LinkHTMLAttributes extends GlobalHTMLAttributes {
  as?: HellaPrimative;
  crossorigin?: HellaPrimative<"anonymous" | "use-credentials">;
  href?: HellaPrimative;
  hreflang?: HellaPrimative;
  media?: HellaPrimative;
  rel?: HellaPrimative;
  sizes?: HellaPrimative;
  type?: HellaPrimative;
}

interface MapHTMLAttributes extends GlobalHTMLAttributes {
  name?: HellaPrimative;
}

interface MetaHTMLAttributes extends GlobalHTMLAttributes {
  charset?: HellaPrimative;
  content?: HellaPrimative;
  httpEquiv?: HellaPrimative;
  name?: HellaPrimative;
}

interface MeterHTMLAttributes extends GlobalHTMLAttributes {
  form?: HellaPrimative;
  high?: HellaPrimative<number>;
  low?: HellaPrimative<number>;
  max?: HellaPrimative<number>;
  min?: HellaPrimative<number>;
  optimum?: HellaPrimative<number>;
  value?: HellaPrimative<number>;
}

interface ObjectHTMLAttributes extends GlobalHTMLAttributes {
  objectData?: HellaPrimative;
  form?: HellaPrimative;
  height?: HellaPrimative;
  name?: HellaPrimative;
  type?: HellaPrimative;
  usemap?: HellaPrimative;
  width?: HellaPrimative;
}

interface OlHTMLAttributes extends GlobalHTMLAttributes {
  reversed?: HellaPrimative<boolean>;
  start?: HellaPrimative<number>;
  type?: HellaPrimative<"1" | "a" | "A" | "i" | "I">;
}

interface OptgroupHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: HellaPrimative<boolean>;
  label?: HellaPrimative;
}

interface OptionHTMLAttributes extends GlobalHTMLAttributes {
  disabled?: HellaPrimative<boolean>;
  label?: HellaPrimative;
  selected?: HellaPrimative<boolean>;
  value?: HellaPrimative;
}

interface OutputHTMLAttributes extends GlobalHTMLAttributes {
  for?: HellaPrimative;
  form?: HellaPrimative;
  name?: HellaPrimative;
}

interface ProgressHTMLAttributes extends GlobalHTMLAttributes {
  max?: HellaPrimative<number>;
  value?: HellaPrimative<number>;
}

interface ScriptHTMLAttributes extends GlobalHTMLAttributes {
  async?: HellaPrimative<boolean>;
  crossorigin?: HellaPrimative<"anonymous" | "use-credentials">;
  defer?: HellaPrimative<boolean>;
  integrity?: HellaPrimative;
  nomodule?: HellaPrimative<boolean>;
  nonce?: HellaPrimative;
  src?: HellaPrimative;
  type?: HellaPrimative;
}

interface SelectHTMLAttributes extends GlobalHTMLAttributes {
  autocomplete?: HellaPrimative;
  autofocus?: HellaPrimative<boolean>;
  disabled?: HellaPrimative<boolean>;
  form?: HellaPrimative;
  multiple?: HellaPrimative<boolean>;
  name?: HellaPrimative;
  required?: HellaPrimative<boolean>;
  size?: HellaPrimative<number>;
  value?: HellaPrimative;
}

interface SourceHTMLAttributes extends GlobalHTMLAttributes {
  media?: HellaPrimative;
  sizes?: HellaPrimative;
  src?: HellaPrimative;
  srcset?: HellaPrimative;
  type?: HellaPrimative;
}

interface StyleHTMLAttributes extends GlobalHTMLAttributes {
  media?: HellaPrimative;
  nonce?: HellaPrimative;
  scoped?: HellaPrimative<boolean>;
  type?: HellaPrimative;
}

interface TableHTMLAttributes extends GlobalHTMLAttributes {
  cellPadding?: HellaPrimative;
  cellSpacing?: HellaPrimative;
  summary?: HellaPrimative;
}

interface TextareaHTMLAttributes extends GlobalHTMLAttributes {
  autocomplete?: HellaPrimative;
  autofocus?: HellaPrimative<boolean>;
  cols?: HellaPrimative<number>;
  dirname?: HellaPrimative;
  disabled?: HellaPrimative<boolean>;
  form?: HellaPrimative;
  maxlength?: HellaPrimative<number>;
  minlength?: HellaPrimative<number>;
  name?: HellaPrimative;
  placeholder?: HellaPrimative;
  readonly?: HellaPrimative<boolean>;
  required?: HellaPrimative<boolean>;
  rows?: HellaPrimative<number>;
  value?: HellaPrimative;
  wrap?: HellaPrimative<"hard" | "soft">;
}

interface TdHTMLAttributes extends GlobalHTMLAttributes {
  colspan?: HellaPrimative<number>;
  headers?: HellaPrimative;
  rowspan?: HellaPrimative<number>;
}

interface ThHTMLAttributes extends GlobalHTMLAttributes {
  colspan?: HellaPrimative<number>;
  headers?: HellaPrimative;
  rowspan?: HellaPrimative<number>;
  scope?: HellaPrimative<"col" | "row" | "rowgroup" | "colgroup">;
}

interface TimeHTMLAttributes extends GlobalHTMLAttributes {
  datetime?: HellaPrimative;
}

interface TrackHTMLAttributes extends GlobalHTMLAttributes {
  default?: HellaPrimative<boolean>;
  kind?: HellaPrimative<
    "subtitles" | "captions" | "descriptions" | "chapters" | "metadata"
  >;
  label?: HellaPrimative;
  src?: HellaPrimative;
  srclang?: HellaPrimative;
}

interface VideoHTMLAttributes extends GlobalHTMLAttributes {
  autoplay?: HellaPrimative<boolean>;
  controls?: HellaPrimative<boolean>;
  crossorigin?: HellaPrimative<"anonymous" | "use-credentials">;
  height?: HellaPrimative;
  loop?: HellaPrimative<boolean>;
  muted?: HellaPrimative<boolean>;
  playsinline?: HellaPrimative<boolean>;
  poster?: HellaPrimative;
  preload?: HellaPrimative<"none" | "metadata" | "auto">;
  src?: HellaPrimative;
  width?: HellaPrimative;
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
