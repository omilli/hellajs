import type { Signal } from "../signal";

/**
 * Represents valid HTML tag names.
 */
export type HTMLTagName = keyof HTMLElementTagNameMap;
/**
 * A type that can either be the raw value or a Signal containing that value
 */
export type SignalValue<T> = T | Signal<T>;

// Global HTML attributes that apply to all elements
export interface GlobalHTMLAttributes {
	id?: SignalValue<string> | SignalValue<number>;
	className?: SignalValue<string> | SignalValue<number>;
	style?: SignalValue<string> | SignalValue<number>;
	title?: SignalValue<string> | SignalValue<number>;
	tabindex?: SignalValue<number>;
	hidden?: SignalValue<boolean>;
	draggable?: SignalValue<boolean>;
	dir?: SignalValue<"ltr" | "rtl" | "auto">;
	lang?: SignalValue<string> | SignalValue<number>;
	slot?: SignalValue<string> | SignalValue<number>;
	accesskey?: SignalValue<string> | SignalValue<number>;
	contenteditable?: SignalValue<boolean | "true" | "false">;
	// ARIA attributes
	role?: SignalValue<string> | SignalValue<number>;
	"aria-label"?: SignalValue<string> | SignalValue<number>;
	"aria-labelledby"?: SignalValue<string> | SignalValue<number>;
	"aria-describedby"?: SignalValue<string> | SignalValue<number>;
	"aria-atomic"?: SignalValue<boolean | "true" | "false">;
	"aria-autocomplete"?: SignalValue<"none" | "inline" | "list" | "both">;
	"aria-busy"?: SignalValue<boolean | "true" | "false">;
	"aria-checked"?: SignalValue<boolean | "true" | "false" | "mixed">;
	"aria-colcount"?: SignalValue<number>;
	"aria-colindex"?: SignalValue<number>;
	"aria-colspan"?: SignalValue<number>;
	"aria-controls"?: SignalValue<string> | SignalValue<number>;
	"aria-current"?: SignalValue<
		| boolean
		| "true"
		| "false"
		| "page"
		| "step"
		| "location"
		| "date"
		| "time"
	>;
	"aria-disabled"?: SignalValue<boolean | "true" | "false">;
	"aria-expanded"?: SignalValue<boolean | "true" | "false">;
	"aria-haspopup"?: SignalValue<
		| boolean
		| "true"
		| "false"
		| "menu"
		| "listbox"
		| "tree"
		| "grid"
		| "dialog"
	>;
	"aria-hidden"?: SignalValue<boolean | "true" | "false">;
	"aria-invalid"?: SignalValue<boolean | "true" | "false" | "grammar" | "spelling">;
	"aria-keyshortcuts"?: SignalValue<string> | SignalValue<number>;
	"aria-level"?: SignalValue<number>;
	"aria-live"?: SignalValue<"off" | "assertive" | "polite">;
	"aria-modal"?: SignalValue<boolean | "true" | "false">;
	"aria-multiline"?: SignalValue<boolean | "true" | "false">;
	"aria-multiselectable"?: SignalValue<boolean | "true" | "false">;
	"aria-orientation"?: SignalValue<"horizontal" | "vertical">;
	"aria-owns"?: SignalValue<string> | SignalValue<number>;
	"aria-placeholder"?: SignalValue<string> | SignalValue<number>;
	"aria-posinset"?: SignalValue<number>;
	"aria-pressed"?: SignalValue<boolean | "true" | "false" | "mixed">;
	"aria-readonly"?: SignalValue<boolean | "true" | "false">;
	"aria-required"?: SignalValue<boolean | "true" | "false">;
	"aria-roledescription"?: SignalValue<string> | SignalValue<number>;
	"aria-rowcount"?: SignalValue<number>;
	"aria-rowindex"?: SignalValue<number>;
	"aria-rowspan"?: SignalValue<number>;
	"aria-selected"?: SignalValue<boolean | "true" | "false">;
	"aria-setsize"?: SignalValue<number>;
	"aria-sort"?: SignalValue<"none" | "ascending" | "descending" | "other">;
	"aria-valuemax"?: SignalValue<number>;
	"aria-valuemin"?: SignalValue<number>;
	"aria-valuenow"?: SignalValue<number>;
	"aria-valuetext"?: SignalValue<string> | SignalValue<number>;

	// Allow for data-* attributes
	dataset?: Record<string, string>;

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
	onerror?: string | number;
}

// Element-specific attributes
interface AnchorHTMLAttributes extends GlobalHTMLAttributes {
	href?: SignalValue<string> | SignalValue<number>;
	target?: SignalValue<"_blank" | "_self" | "_parent" | "_top">;
	rel?: SignalValue<string> | SignalValue<number>;
	download?: SignalValue<unknown>;
	hreflang?: SignalValue<string> | SignalValue<number>;
	type?: SignalValue<string> | SignalValue<number>;
	referrerpolicy?: SignalValue<
		| "no-referrer"
		| "no-referrer-when-downgrade"
		| "origin"
		| "origin-when-cross-origin"
		| "unsafe-url">;
	ping?: SignalValue<string> | SignalValue<number>;
}

interface ButtonHTMLAttributes extends GlobalHTMLAttributes {
	type?: SignalValue<"button" | "submit" | "reset">;
	disabled?: SignalValue<boolean>;
	form?: SignalValue<string> | SignalValue<number>;
	formaction?: SignalValue<string> | SignalValue<number>;
	formenctype?: SignalValue<string> | SignalValue<number>;
	formmethod?: SignalValue<string> | SignalValue<number>;
	formnovalidate?: SignalValue<boolean>;
	formtarget?: SignalValue<string> | SignalValue<number>;
	name?: SignalValue<string> | SignalValue<number>;
	value?: SignalValue<string> | SignalValue<number>;
	autofocus?: SignalValue<boolean>;
}

interface InputHTMLAttributes extends GlobalHTMLAttributes {
	type?: SignalValue<
		| "button"
		| "checkbox"
		| "color"
		| "date"
		| "datetime-local"
		| "email"
		| "file"
		| "hidden"
		| "image"
		| "month"
		| "number"
		| "password"
		| "radio"
		| "range"
		| "reset"
		| "search"
		| "submit"
		| "tel"
		| "text"
		| "time"
		| "url"
		| "week">;
	name?: SignalValue<string> | SignalValue<number>;
	value?: SignalValue<string | number>;
	disabled?: SignalValue<boolean>;
	checked?: SignalValue<boolean>;
	placeholder?: SignalValue<string> | SignalValue<number>;
	readOnly?: SignalValue<boolean>;
	required?: SignalValue<boolean>;
	min?: SignalValue<number | string>;
	max?: SignalValue<number | string>;
	step?: SignalValue<number | string>;
	pattern?: SignalValue<string> | SignalValue<number>;
	accept?: SignalValue<string> | SignalValue<number>;
	autocomplete?: SignalValue<string> | SignalValue<number>;
	autofocus?: SignalValue<boolean>;
	capture?: SignalValue<boolean | "user" | "environment">;
	dirname?: SignalValue<string> | SignalValue<number>;
	form?: SignalValue<string> | SignalValue<number>;
	formaction?: SignalValue<string> | SignalValue<number>;
	formenctype?: SignalValue<string> | SignalValue<number>;
	formmethod?: SignalValue<string> | SignalValue<number>;
	formnovalidate?: SignalValue<boolean>;
	formtarget?: SignalValue<string> | SignalValue<number>;
	height?: SignalValue<number | string>;
	list?: SignalValue<string> | SignalValue<number>;
	maxlength?: SignalValue<number>;
	minlength?: SignalValue<number>;
	multiple?: SignalValue<boolean>;
	size?: SignalValue<number>;
	src?: SignalValue<string> | SignalValue<number>;
	width?: SignalValue<number | string>;
}

// Additional HTML element interfaces

interface AreaHTMLAttributes extends GlobalHTMLAttributes {
	alt?: SignalValue<string> | SignalValue<number>;
	coords?: SignalValue<string> | SignalValue<number>;
	download?: SignalValue<unknown>;
	href?: SignalValue<string> | SignalValue<number>;
	hreflang?: SignalValue<string> | SignalValue<number>;
	media?: SignalValue<string> | SignalValue<number>;
	referrerpolicy?: SignalValue<string> | SignalValue<number>;
	rel?: SignalValue<string> | SignalValue<number>;
	shape?: SignalValue<"rect" | "circle" | "poly" | "default">;
	target?: SignalValue<string> | SignalValue<number>;
	type?: SignalValue<string> | SignalValue<number>;
}

interface AudioHTMLAttributes extends GlobalHTMLAttributes {
	autoplay?: SignalValue<boolean>;
	controls?: SignalValue<boolean>;
	crossorigin?: SignalValue<"anonymous" | "use-credentials">;
	loop?: SignalValue<boolean>;
	muted?: SignalValue<boolean>;
	preload?: SignalValue<"none" | "metadata" | "auto">;
	src?: SignalValue<string> | SignalValue<number>;
}

interface BaseHTMLAttributes extends GlobalHTMLAttributes {
	href?: SignalValue<string> | SignalValue<number>;
	target?: SignalValue<string> | SignalValue<number>;
}

interface BlockquoteHTMLAttributes extends GlobalHTMLAttributes {
	cite?: SignalValue<string> | SignalValue<number>;
}

interface CanvasHTMLAttributes extends GlobalHTMLAttributes {
	height?: SignalValue<number | string>;
	width?: SignalValue<number | string>;
}

interface ColHTMLAttributes extends GlobalHTMLAttributes {
	span?: SignalValue<number>;
	width?: SignalValue<number | string>;
}

interface ColgroupHTMLAttributes extends GlobalHTMLAttributes {
	span?: SignalValue<number>;
}

interface DataHTMLAttributes extends GlobalHTMLAttributes {
	value?: SignalValue<string> | SignalValue<number>;
}

interface DetailsHTMLAttributes extends GlobalHTMLAttributes {
	open?: SignalValue<boolean>;
}

interface DialogHTMLAttributes extends GlobalHTMLAttributes {
	open?: SignalValue<boolean>;
}

interface EmbedHTMLAttributes extends GlobalHTMLAttributes {
	height?: SignalValue<number | string>;
	src?: SignalValue<string> | SignalValue<number>;
	type?: SignalValue<string> | SignalValue<number>;
	width?: SignalValue<number | string>;
}

interface FieldsetHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: SignalValue<boolean>;
	form?: SignalValue<string> | SignalValue<number>;
	name?: SignalValue<string> | SignalValue<number>;
}

interface FormHTMLAttributes extends GlobalHTMLAttributes {
	acceptCharset?: SignalValue<string> | SignalValue<number>;
	action?: SignalValue<string> | SignalValue<number>;
	autocomplete?: SignalValue<"on" | "off">;
	enctype?: SignalValue<
		| "application/x-www-form-urlencoded"
		| "multipart/form-data"
		| "text/plain">;
	method?: SignalValue<"get" | "post">;
	name?: SignalValue<string> | SignalValue<number>;
	novalidate?: SignalValue<boolean>;
	target?: SignalValue<string> | SignalValue<number>;
	rel?: SignalValue<string> | SignalValue<number>;
}

interface HtmlHTMLAttributes extends GlobalHTMLAttributes {
	xmlns?: SignalValue<string> | SignalValue<number>;
}

interface IframeHTMLAttributes extends GlobalHTMLAttributes {
	allow?: SignalValue<string> | SignalValue<number>;
	allowfullscreen?: SignalValue<boolean>;
	height?: SignalValue<number | string>;
	loading?: SignalValue<"eager" | "lazy">;
	name?: SignalValue<string> | SignalValue<number>;
	referrerpolicy?: SignalValue<string> | SignalValue<number>;
	sandbox?: SignalValue<string> | SignalValue<number>;
	src?: SignalValue<string> | SignalValue<number>;
	srcdoc?: SignalValue<string> | SignalValue<number>;
	width?: SignalValue<number | string>;
}

interface ImgHTMLAttributes extends GlobalHTMLAttributes {
	alt?: SignalValue<string> | SignalValue<number>;
	crossorigin?: SignalValue<"anonymous" | "use-credentials">;
	decoding?: SignalValue<"sync" | "async" | "auto">;
	height?: SignalValue<number | string>;
	ismap?: SignalValue<boolean>;
	loading?: SignalValue<"eager" | "lazy">;
	referrerpolicy?: SignalValue<string> | SignalValue<number>;
	sizes?: SignalValue<string> | SignalValue<number>;
	src?: SignalValue<string> | SignalValue<number>;
	srcset?: SignalValue<string> | SignalValue<number>;
	usemap?: SignalValue<string> | SignalValue<number>;
	width?: SignalValue<number | string>;
}

interface LabelHTMLAttributes extends GlobalHTMLAttributes {
	for?: SignalValue<string> | SignalValue<number>;
	form?: SignalValue<string> | SignalValue<number>;
}

interface LiHTMLAttributes extends GlobalHTMLAttributes {
	value?: SignalValue<number>;
}

interface LinkHTMLAttributes extends GlobalHTMLAttributes {
	as?: SignalValue<string> | SignalValue<number>;
	crossorigin?: SignalValue<"anonymous" | "use-credentials">;
	href?: SignalValue<string> | SignalValue<number>;
	hreflang?: SignalValue<string> | SignalValue<number>;
	media?: SignalValue<string> | SignalValue<number>;
	rel?: SignalValue<string> | SignalValue<number>;
	sizes?: SignalValue<string> | SignalValue<number>;
	type?: SignalValue<string> | SignalValue<number>;
}

interface MapHTMLAttributes extends GlobalHTMLAttributes {
	name?: SignalValue<string> | SignalValue<number>;
}

interface MetaHTMLAttributes extends GlobalHTMLAttributes {
	charset?: SignalValue<string> | SignalValue<number>;
	content?: SignalValue<string> | SignalValue<number>;
	httpEquiv?: SignalValue<string> | SignalValue<number>;
	name?: SignalValue<string> | SignalValue<number>;
}

interface MeterHTMLAttributes extends GlobalHTMLAttributes {
	form?: SignalValue<string> | SignalValue<number>;
	high?: SignalValue<number>;
	low?: SignalValue<number>;
	max?: SignalValue<number>;
	min?: SignalValue<number>;
	optimum?: SignalValue<number>;
	value?: SignalValue<number>;
}

interface ObjectHTMLAttributes extends GlobalHTMLAttributes {
	data?: SignalValue<string> | SignalValue<number>;
	form?: SignalValue<string> | SignalValue<number>;
	height?: SignalValue<number | string>;
	name?: SignalValue<string> | SignalValue<number>;
	type?: SignalValue<string> | SignalValue<number>;
	usemap?: SignalValue<string> | SignalValue<number>;
	width?: SignalValue<number | string>;
}

interface OlHTMLAttributes extends GlobalHTMLAttributes {
	reversed?: SignalValue<boolean>;
	start?: SignalValue<number>;
	type?: SignalValue<"1" | "a" | "A" | "i" | "I">;
}

interface OptgroupHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: SignalValue<boolean>;
	label?: SignalValue<string> | SignalValue<number>;
}

interface OptionHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: SignalValue<boolean>;
	label?: SignalValue<string> | SignalValue<number>;
	selected?: SignalValue<boolean>;
	value?: SignalValue<string> | SignalValue<number>;
}

interface OutputHTMLAttributes extends GlobalHTMLAttributes {
	for?: SignalValue<string> | SignalValue<number>;
	form?: SignalValue<string> | SignalValue<number>;
	name?: SignalValue<string> | SignalValue<number>;
}

interface ProgressHTMLAttributes extends GlobalHTMLAttributes {
	max?: SignalValue<number>;
	value?: SignalValue<number>;
}

interface ScriptHTMLAttributes extends GlobalHTMLAttributes {
	async?: SignalValue<boolean>;
	crossorigin?: SignalValue<"anonymous" | "use-credentials">;
	defer?: SignalValue<boolean>;
	integrity?: SignalValue<string> | SignalValue<number>;
	nomodule?: SignalValue<boolean>;
	nonce?: SignalValue<string> | SignalValue<number>;
	src?: SignalValue<string> | SignalValue<number>;
	type?: SignalValue<string> | SignalValue<number>;
}

interface SelectHTMLAttributes extends GlobalHTMLAttributes {
	autocomplete?: SignalValue<string> | SignalValue<number>;
	autofocus?: SignalValue<boolean>;
	disabled?: SignalValue<boolean>;
	form?: SignalValue<string> | SignalValue<number>;
	multiple?: SignalValue<boolean>;
	name?: SignalValue<string> | SignalValue<number>;
	required?: SignalValue<boolean>;
	size?: SignalValue<number>;
	value?: SignalValue<string> | SignalValue<number>;
}

interface SourceHTMLAttributes extends GlobalHTMLAttributes {
	media?: SignalValue<string> | SignalValue<number>;
	sizes?: SignalValue<string> | SignalValue<number>;
	src?: SignalValue<string> | SignalValue<number>;
	srcset?: SignalValue<string> | SignalValue<number>;
	type?: SignalValue<string> | SignalValue<number>;
}

interface StyleHTMLAttributes extends GlobalHTMLAttributes {
	media?: SignalValue<string> | SignalValue<number>;
	nonce?: SignalValue<string> | SignalValue<number>;
	scoped?: SignalValue<boolean>;
	type?: SignalValue<string> | SignalValue<number>;
}

interface TableHTMLAttributes extends GlobalHTMLAttributes {
	cellPadding?: SignalValue<number | string>;
	cellSpacing?: SignalValue<number | string>;
	summary?: SignalValue<string> | SignalValue<number>;
}

interface TextareaHTMLAttributes extends GlobalHTMLAttributes {
	autocomplete?: SignalValue<string> | SignalValue<number>;
	autofocus?: SignalValue<boolean>;
	cols?: SignalValue<number>;
	dirname?: SignalValue<string> | SignalValue<number>;
	disabled?: SignalValue<boolean>;
	form?: SignalValue<string> | SignalValue<number>;
	maxlength?: SignalValue<number>;
	minlength?: SignalValue<number>;
	name?: SignalValue<string> | SignalValue<number>;
	placeholder?: SignalValue<string> | SignalValue<number>;
	readonly?: SignalValue<boolean>;
	required?: SignalValue<boolean>;
	rows?: SignalValue<number>;
	value?: SignalValue<string> | SignalValue<number>;
	wrap?: SignalValue<"hard" | "soft">;
}

interface TdHTMLAttributes extends GlobalHTMLAttributes {
	colspan?: SignalValue<number>;
	headers?: SignalValue<string> | SignalValue<number>;
	rowspan?: SignalValue<number>;
}

interface ThHTMLAttributes extends GlobalHTMLAttributes {
	colspan?: SignalValue<number>;
	headers?: SignalValue<string> | SignalValue<number>;
	rowspan?: SignalValue<number>;
	scope?: SignalValue<"col" | "row" | "rowgroup" | "colgroup">;
}

interface TimeHTMLAttributes extends GlobalHTMLAttributes {
	datetime?: SignalValue<string> | SignalValue<number>;
}

interface TrackHTMLAttributes extends GlobalHTMLAttributes {
	default?: SignalValue<boolean>;
	kind?: SignalValue<"subtitles" | "captions" | "descriptions" | "chapters" | "metadata">;
	label?: SignalValue<string> | SignalValue<number>;
	src?: SignalValue<string> | SignalValue<number>;
	srclang?: SignalValue<string> | SignalValue<number>;
}

interface VideoHTMLAttributes extends GlobalHTMLAttributes {
	autoplay?: SignalValue<boolean>;
	controls?: SignalValue<boolean>;
	crossorigin?: SignalValue<"anonymous" | "use-credentials">;
	height?: SignalValue<number | string>;
	loop?: SignalValue<boolean>;
	muted?: SignalValue<boolean>;
	playsinline?: SignalValue<boolean>;
	poster?: SignalValue<string> | SignalValue<number>;
	preload?: SignalValue<"none" | "metadata" | "auto">;
	src?: SignalValue<string> | SignalValue<number>;
	width?: SignalValue<number | string>;
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

// Map HTML tag names to their specific attribute interfaces
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

// Utility type to get attributes for a specific element
export type HTMLAttributes<K extends keyof HTMLAttributeMap> =
	HTMLAttributeMap[K];
