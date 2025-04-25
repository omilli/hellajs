import type { VNodeString } from "./dom";
import type { WriteableSignal, ReadonlySignal } from "./reactive";
/**
 * A type that can either be the raw value or a Signal containing that value
 */
export type HTMLSignalValue<T> = T | WriteableSignal<T> | ReadonlySignal<T>;
export type HTMLSignalAttribute = HTMLSignalValue<string> | HTMLSignalValue<number>;

// Global HTML attributes that apply to all elements
export interface GlobalHTMLAttributes {
	id?: HTMLSignalAttribute;
	class?: HTMLSignalAttribute;
	style?: HTMLSignalAttribute;
	title?: HTMLSignalAttribute;
	tabindex?: HTMLSignalValue<number>;
	hidden?: HTMLSignalValue<boolean>;
	draggable?: HTMLSignalValue<boolean>;
	dir?: HTMLSignalValue<"ltr" | "rtl" | "auto">;
	lang?: HTMLSignalAttribute;
	slot?: HTMLSignalAttribute;
	for?: HTMLSignalAttribute;
	accesskey?: HTMLSignalAttribute;
	contenteditable?: HTMLSignalValue<boolean | "true" | "false">;
	data?: Record<string, HTMLSignalAttribute>;

	// ARIA attributes
	role?: HTMLSignalAttribute;
	"aria-label"?: HTMLSignalAttribute;
	"aria-labelledby"?: HTMLSignalAttribute;
	"aria-describedby"?: HTMLSignalAttribute;
	"aria-atomic"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-autocomplete"?: HTMLSignalValue<"none" | "inline" | "list" | "both">;
	"aria-busy"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-checked"?: HTMLSignalValue<boolean | "true" | "false" | "mixed">;
	"aria-colcount"?: HTMLSignalValue<number>;
	"aria-colindex"?: HTMLSignalValue<number>;
	"aria-colspan"?: HTMLSignalValue<number>;
	"aria-controls"?: HTMLSignalAttribute;
	"aria-current"?: HTMLSignalValue<
		| boolean
		| "true"
		| "false"
		| "page"
		| "step"
		| "location"
		| "date"
		| "time"
	>;
	"aria-disabled"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-expanded"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-haspopup"?: HTMLSignalValue<
		| boolean
		| "true"
		| "false"
		| "menu"
		| "listbox"
		| "tree"
		| "grid"
		| "dialog"
	>;
	"aria-hidden"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-invalid"?: HTMLSignalValue<boolean | "true" | "false" | "grammar" | "spelling">;
	"aria-keyshortcuts"?: HTMLSignalAttribute;
	"aria-level"?: HTMLSignalValue<number>;
	"aria-live"?: HTMLSignalValue<"off" | "assertive" | "polite">;
	"aria-modal"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-multiline"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-multiselectable"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-orientation"?: HTMLSignalValue<"horizontal" | "vertical">;
	"aria-owns"?: HTMLSignalAttribute;
	"aria-placeholder"?: HTMLSignalAttribute;
	"aria-posinset"?: HTMLSignalValue<number>;
	"aria-pressed"?: HTMLSignalValue<boolean | "true" | "false" | "mixed">;
	"aria-readonly"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-required"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-roledescription"?: HTMLSignalAttribute;
	"aria-rowcount"?: HTMLSignalValue<number>;
	"aria-rowindex"?: HTMLSignalValue<number>;
	"aria-rowspan"?: HTMLSignalValue<number>;
	"aria-selected"?: HTMLSignalValue<boolean | "true" | "false">;
	"aria-setsize"?: HTMLSignalValue<number>;
	"aria-sort"?: HTMLSignalValue<"none" | "ascending" | "descending" | "other">;
	"aria-valuemax"?: HTMLSignalValue<number>;
	"aria-valuemin"?: HTMLSignalValue<number>;
	"aria-valuenow"?: HTMLSignalValue<number>;
	"aria-valuetext"?: HTMLSignalAttribute;

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
	onerror?: VNodeString;
}

// Element-specific attributes
interface AnchorHTMLAttributes extends GlobalHTMLAttributes {
	href?: HTMLSignalAttribute;
	target?: HTMLSignalValue<"_blank" | "_self" | "_parent" | "_top">;
	rel?: HTMLSignalAttribute;
	download?: HTMLSignalValue<unknown>;
	hreflang?: HTMLSignalAttribute;
	type?: HTMLSignalAttribute;
	referrerpolicy?: HTMLSignalValue<
		| "no-referrer"
		| "no-referrer-when-downgrade"
		| "origin"
		| "origin-when-cross-origin"
		| "unsafe-url">;
	ping?: HTMLSignalAttribute;
}

interface ButtonHTMLAttributes extends GlobalHTMLAttributes {
	type?: HTMLSignalValue<"button" | "submit" | "reset">;
	disabled?: HTMLSignalValue<boolean>;
	form?: HTMLSignalAttribute;
	formaction?: HTMLSignalAttribute;
	formenctype?: HTMLSignalAttribute;
	formmethod?: HTMLSignalAttribute;
	formnovalidate?: HTMLSignalValue<boolean>;
	formtarget?: HTMLSignalAttribute;
	name?: HTMLSignalAttribute;
	value?: HTMLSignalAttribute;
	autofocus?: HTMLSignalValue<boolean>;
}

interface InputHTMLAttributes extends GlobalHTMLAttributes {
	type?: HTMLSignalValue<
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
	name?: HTMLSignalAttribute;
	value?: HTMLSignalValue<VNodeString>;
	disabled?: HTMLSignalValue<boolean>;
	checked?: HTMLSignalValue<boolean>;
	placeholder?: HTMLSignalAttribute;
	readOnly?: HTMLSignalValue<boolean>;
	required?: HTMLSignalValue<boolean>;
	min?: HTMLSignalValue<number | string>;
	max?: HTMLSignalValue<number | string>;
	step?: HTMLSignalValue<number | string>;
	pattern?: HTMLSignalAttribute;
	accept?: HTMLSignalAttribute;
	autocomplete?: HTMLSignalAttribute;
	autofocus?: HTMLSignalValue<boolean>;
	capture?: HTMLSignalValue<boolean | "user" | "environment">;
	dirname?: HTMLSignalAttribute;
	form?: HTMLSignalAttribute;
	formaction?: HTMLSignalAttribute;
	formenctype?: HTMLSignalAttribute;
	formmethod?: HTMLSignalAttribute;
	formnovalidate?: HTMLSignalValue<boolean>;
	formtarget?: HTMLSignalAttribute;
	height?: HTMLSignalValue<number | string>;
	list?: HTMLSignalAttribute;
	maxlength?: HTMLSignalValue<number>;
	minlength?: HTMLSignalValue<number>;
	multiple?: HTMLSignalValue<boolean>;
	size?: HTMLSignalValue<number>;
	src?: HTMLSignalAttribute;
	width?: HTMLSignalValue<number | string>;
}

// Additional HTML element interfaces

interface AreaHTMLAttributes extends GlobalHTMLAttributes {
	alt?: HTMLSignalAttribute;
	coords?: HTMLSignalAttribute;
	download?: HTMLSignalValue<unknown>;
	href?: HTMLSignalAttribute;
	hreflang?: HTMLSignalAttribute;
	media?: HTMLSignalAttribute;
	referrerpolicy?: HTMLSignalAttribute;
	rel?: HTMLSignalAttribute;
	shape?: HTMLSignalValue<"rect" | "circle" | "poly" | "default">;
	target?: HTMLSignalAttribute;
	type?: HTMLSignalAttribute;
}

interface AudioHTMLAttributes extends GlobalHTMLAttributes {
	autoplay?: HTMLSignalValue<boolean>;
	controls?: HTMLSignalValue<boolean>;
	crossorigin?: HTMLSignalValue<"anonymous" | "use-credentials">;
	loop?: HTMLSignalValue<boolean>;
	muted?: HTMLSignalValue<boolean>;
	preload?: HTMLSignalValue<"none" | "metadata" | "auto">;
	src?: HTMLSignalAttribute;
}

interface BaseHTMLAttributes extends GlobalHTMLAttributes {
	href?: HTMLSignalAttribute;
	target?: HTMLSignalAttribute;
}

interface BlockquoteHTMLAttributes extends GlobalHTMLAttributes {
	cite?: HTMLSignalAttribute;
}

interface CanvasHTMLAttributes extends GlobalHTMLAttributes {
	height?: HTMLSignalValue<number | string>;
	width?: HTMLSignalValue<number | string>;
}

interface ColHTMLAttributes extends GlobalHTMLAttributes {
	span?: HTMLSignalValue<number>;
	width?: HTMLSignalValue<number | string>;
}

interface ColgroupHTMLAttributes extends GlobalHTMLAttributes {
	span?: HTMLSignalValue<number>;
}

interface DataHTMLAttributes extends GlobalHTMLAttributes {
	value?: HTMLSignalAttribute;
}

interface DetailsHTMLAttributes extends GlobalHTMLAttributes {
	open?: HTMLSignalValue<boolean>;
}

interface DialogHTMLAttributes extends GlobalHTMLAttributes {
	open?: HTMLSignalValue<boolean>;
}

interface EmbedHTMLAttributes extends GlobalHTMLAttributes {
	height?: HTMLSignalValue<number | string>;
	src?: HTMLSignalAttribute;
	type?: HTMLSignalAttribute;
	width?: HTMLSignalValue<number | string>;
}

interface FieldsetHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: HTMLSignalValue<boolean>;
	form?: HTMLSignalAttribute;
	name?: HTMLSignalAttribute;
}

interface FormHTMLAttributes extends GlobalHTMLAttributes {
	acceptCharset?: HTMLSignalAttribute;
	action?: HTMLSignalAttribute;
	autocomplete?: HTMLSignalValue<"on" | "off">;
	enctype?: HTMLSignalValue<
		| "application/x-www-form-urlencoded"
		| "multipart/form-data"
		| "text/plain">;
	method?: HTMLSignalValue<"get" | "post">;
	name?: HTMLSignalAttribute;
	novalidate?: HTMLSignalValue<boolean>;
	target?: HTMLSignalAttribute;
	rel?: HTMLSignalAttribute;
}

interface HtmlHTMLAttributes extends GlobalHTMLAttributes {
	xmlns?: HTMLSignalAttribute;
}

interface IframeHTMLAttributes extends GlobalHTMLAttributes {
	allow?: HTMLSignalAttribute;
	allowfullscreen?: HTMLSignalValue<boolean>;
	height?: HTMLSignalValue<number | string>;
	loading?: HTMLSignalValue<"eager" | "lazy">;
	name?: HTMLSignalAttribute;
	referrerpolicy?: HTMLSignalAttribute;
	sandbox?: HTMLSignalAttribute;
	src?: HTMLSignalAttribute;
	srcdoc?: HTMLSignalAttribute;
	width?: HTMLSignalValue<number | string>;
}

interface ImgHTMLAttributes extends GlobalHTMLAttributes {
	alt?: HTMLSignalAttribute;
	crossorigin?: HTMLSignalValue<"anonymous" | "use-credentials">;
	decoding?: HTMLSignalValue<"sync" | "async" | "auto">;
	height?: HTMLSignalValue<number | string>;
	ismap?: HTMLSignalValue<boolean>;
	loading?: HTMLSignalValue<"eager" | "lazy">;
	referrerpolicy?: HTMLSignalAttribute;
	sizes?: HTMLSignalAttribute;
	src?: HTMLSignalAttribute;
	srcset?: HTMLSignalAttribute;
	usemap?: HTMLSignalAttribute;
	width?: HTMLSignalValue<number | string>;
}

interface LabelHTMLAttributes extends GlobalHTMLAttributes {
	for?: HTMLSignalAttribute;
	form?: HTMLSignalAttribute;
}

interface LiHTMLAttributes extends GlobalHTMLAttributes {
	value?: HTMLSignalValue<number>;
}

interface LinkHTMLAttributes extends GlobalHTMLAttributes {
	as?: HTMLSignalAttribute;
	crossorigin?: HTMLSignalValue<"anonymous" | "use-credentials">;
	href?: HTMLSignalAttribute;
	hreflang?: HTMLSignalAttribute;
	media?: HTMLSignalAttribute;
	rel?: HTMLSignalAttribute;
	sizes?: HTMLSignalAttribute;
	type?: HTMLSignalAttribute;
}

interface MapHTMLAttributes extends GlobalHTMLAttributes {
	name?: HTMLSignalAttribute;
}

interface MetaHTMLAttributes extends GlobalHTMLAttributes {
	charset?: HTMLSignalAttribute;
	content?: HTMLSignalAttribute;
	httpEquiv?: HTMLSignalAttribute;
	name?: HTMLSignalAttribute;
}

interface MeterHTMLAttributes extends GlobalHTMLAttributes {
	form?: HTMLSignalAttribute;
	high?: HTMLSignalValue<number>;
	low?: HTMLSignalValue<number>;
	max?: HTMLSignalValue<number>;
	min?: HTMLSignalValue<number>;
	optimum?: HTMLSignalValue<number>;
	value?: HTMLSignalValue<number>;
}

interface ObjectHTMLAttributes extends GlobalHTMLAttributes {
	objectData?: HTMLSignalAttribute;
	form?: HTMLSignalAttribute;
	height?: HTMLSignalValue<number | string>;
	name?: HTMLSignalAttribute;
	type?: HTMLSignalAttribute;
	usemap?: HTMLSignalAttribute;
	width?: HTMLSignalValue<number | string>;
}

interface OlHTMLAttributes extends GlobalHTMLAttributes {
	reversed?: HTMLSignalValue<boolean>;
	start?: HTMLSignalValue<number>;
	type?: HTMLSignalValue<"1" | "a" | "A" | "i" | "I">;
}

interface OptgroupHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: HTMLSignalValue<boolean>;
	label?: HTMLSignalAttribute;
}

interface OptionHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: HTMLSignalValue<boolean>;
	label?: HTMLSignalAttribute;
	selected?: HTMLSignalValue<boolean>;
	value?: HTMLSignalAttribute;
}

interface OutputHTMLAttributes extends GlobalHTMLAttributes {
	for?: HTMLSignalAttribute;
	form?: HTMLSignalAttribute;
	name?: HTMLSignalAttribute;
}

interface ProgressHTMLAttributes extends GlobalHTMLAttributes {
	max?: HTMLSignalValue<number>;
	value?: HTMLSignalValue<number>;
}

interface ScriptHTMLAttributes extends GlobalHTMLAttributes {
	async?: HTMLSignalValue<boolean>;
	crossorigin?: HTMLSignalValue<"anonymous" | "use-credentials">;
	defer?: HTMLSignalValue<boolean>;
	integrity?: HTMLSignalAttribute;
	nomodule?: HTMLSignalValue<boolean>;
	nonce?: HTMLSignalAttribute;
	src?: HTMLSignalAttribute;
	type?: HTMLSignalAttribute;
}

interface SelectHTMLAttributes extends GlobalHTMLAttributes {
	autocomplete?: HTMLSignalAttribute;
	autofocus?: HTMLSignalValue<boolean>;
	disabled?: HTMLSignalValue<boolean>;
	form?: HTMLSignalAttribute;
	multiple?: HTMLSignalValue<boolean>;
	name?: HTMLSignalAttribute;
	required?: HTMLSignalValue<boolean>;
	size?: HTMLSignalValue<number>;
	value?: HTMLSignalAttribute;
}

interface SourceHTMLAttributes extends GlobalHTMLAttributes {
	media?: HTMLSignalAttribute;
	sizes?: HTMLSignalAttribute;
	src?: HTMLSignalAttribute;
	srcset?: HTMLSignalAttribute;
	type?: HTMLSignalAttribute;
}

interface StyleHTMLAttributes extends GlobalHTMLAttributes {
	media?: HTMLSignalAttribute;
	nonce?: HTMLSignalAttribute;
	scoped?: HTMLSignalValue<boolean>;
	type?: HTMLSignalAttribute;
}

interface TableHTMLAttributes extends GlobalHTMLAttributes {
	cellPadding?: HTMLSignalValue<number | string>;
	cellSpacing?: HTMLSignalValue<number | string>;
	summary?: HTMLSignalAttribute;
}

interface TextareaHTMLAttributes extends GlobalHTMLAttributes {
	autocomplete?: HTMLSignalAttribute;
	autofocus?: HTMLSignalValue<boolean>;
	cols?: HTMLSignalValue<number>;
	dirname?: HTMLSignalAttribute;
	disabled?: HTMLSignalValue<boolean>;
	form?: HTMLSignalAttribute;
	maxlength?: HTMLSignalValue<number>;
	minlength?: HTMLSignalValue<number>;
	name?: HTMLSignalAttribute;
	placeholder?: HTMLSignalAttribute;
	readonly?: HTMLSignalValue<boolean>;
	required?: HTMLSignalValue<boolean>;
	rows?: HTMLSignalValue<number>;
	value?: HTMLSignalAttribute;
	wrap?: HTMLSignalValue<"hard" | "soft">;
}

interface TdHTMLAttributes extends GlobalHTMLAttributes {
	colspan?: HTMLSignalValue<number>;
	headers?: HTMLSignalAttribute;
	rowspan?: HTMLSignalValue<number>;
}

interface ThHTMLAttributes extends GlobalHTMLAttributes {
	colspan?: HTMLSignalValue<number>;
	headers?: HTMLSignalAttribute;
	rowspan?: HTMLSignalValue<number>;
	scope?: HTMLSignalValue<"col" | "row" | "rowgroup" | "colgroup">;
}

interface TimeHTMLAttributes extends GlobalHTMLAttributes {
	datetime?: HTMLSignalAttribute;
}

interface TrackHTMLAttributes extends GlobalHTMLAttributes {
	default?: HTMLSignalValue<boolean>;
	kind?: HTMLSignalValue<"subtitles" | "captions" | "descriptions" | "chapters" | "metadata">;
	label?: HTMLSignalAttribute;
	src?: HTMLSignalAttribute;
	srclang?: HTMLSignalAttribute;
}

interface VideoHTMLAttributes extends GlobalHTMLAttributes {
	autoplay?: HTMLSignalValue<boolean>;
	controls?: HTMLSignalValue<boolean>;
	crossorigin?: HTMLSignalValue<"anonymous" | "use-credentials">;
	height?: HTMLSignalValue<number | string>;
	loop?: HTMLSignalValue<boolean>;
	muted?: HTMLSignalValue<boolean>;
	playsinline?: HTMLSignalValue<boolean>;
	poster?: HTMLSignalAttribute;
	preload?: HTMLSignalValue<"none" | "metadata" | "auto">;
	src?: HTMLSignalAttribute;
	width?: HTMLSignalValue<number | string>;
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
