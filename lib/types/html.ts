/**
 * Represents valid HTML tag names.
 */
export type HTMLTagName = keyof HTMLElementTagNameMap;

// Global HTML attributes that apply to all elements
export interface GlobalHTMLAttributes {
	id?: string;
	class?: string; // Will be handled as classNameName
	style?: string;
	title?: string;
	tabindex?: number;
	hidden?: boolean;
	draggable?: boolean;
	dir?: "ltr" | "rtl" | "auto";
	lang?: string;
	slot?: string;
	accesskey?: string;
	contenteditable?: boolean | "true" | "false";
	// ARIA attributes
	role?: string;
	"aria-label"?: string;
	"aria-labelledby"?: string;
	"aria-describedby"?: string;
	"aria-atomic"?: boolean | "true" | "false";
	"aria-autocomplete"?: "none" | "inline" | "list" | "both";
	"aria-busy"?: boolean | "true" | "false";
	"aria-checked"?: boolean | "true" | "false" | "mixed";
	"aria-colcount"?: number;
	"aria-colindex"?: number;
	"aria-colspan"?: number;
	"aria-controls"?: string;
	"aria-current"?:
		| boolean
		| "true"
		| "false"
		| "page"
		| "step"
		| "location"
		| "date"
		| "time";
	"aria-disabled"?: boolean | "true" | "false";
	"aria-expanded"?: boolean | "true" | "false";
	"aria-haspopup"?:
		| boolean
		| "true"
		| "false"
		| "menu"
		| "listbox"
		| "tree"
		| "grid"
		| "dialog";
	"aria-hidden"?: boolean | "true" | "false";
	"aria-invalid"?: boolean | "true" | "false" | "grammar" | "spelling";
	"aria-keyshortcuts"?: string;
	"aria-level"?: number;
	"aria-live"?: "off" | "assertive" | "polite";
	"aria-modal"?: boolean | "true" | "false";
	"aria-multiline"?: boolean | "true" | "false";
	"aria-multiselectable"?: boolean | "true" | "false";
	"aria-orientation"?: "horizontal" | "vertical";
	"aria-owns"?: string;
	"aria-placeholder"?: string;
	"aria-posinset"?: number;
	"aria-pressed"?: boolean | "true" | "false" | "mixed";
	"aria-readonly"?: boolean | "true" | "false";
	"aria-required"?: boolean | "true" | "false";
	"aria-roledescription"?: string;
	"aria-rowcount"?: number;
	"aria-rowindex"?: number;
	"aria-rowspan"?: number;
	"aria-selected"?: boolean | "true" | "false";
	"aria-setsize"?: number;
	"aria-sort"?: "none" | "ascending" | "descending" | "other";
	"aria-valuemax"?: number;
	"aria-valuemin"?: number;
	"aria-valuenow"?: number;
	"aria-valuetext"?: string;

	// Allow for data-* attributes
	dataset?: Record<string, string>;

	// Add index signature to allow arbitrary string keys
	[key: string]: unknown;

	// Event handlers - update types to accept both string and function handlers
	onclick?: string | ((event: MouseEvent, element?: HTMLElement) => void);
	ondblclick?: string | ((event: MouseEvent, element?: HTMLElement) => void);
	onmousedown?: string | ((event: MouseEvent, element?: HTMLElement) => void);
	onmouseup?: string | ((event: MouseEvent, element?: HTMLElement) => void);
	onmouseover?: string | ((event: MouseEvent, element?: HTMLElement) => void);
	onmousemove?: string | ((event: MouseEvent, element?: HTMLElement) => void);
	onmouseout?: string | ((event: MouseEvent, element?: HTMLElement) => void);
	onkeypress?: string | ((event: KeyboardEvent, element?: HTMLElement) => void);
	onkeydown?: string | ((event: KeyboardEvent, element?: HTMLElement) => void);
	onkeyup?: string | ((event: KeyboardEvent, element?: HTMLElement) => void);
	onfocus?: string | ((event: FocusEvent, element?: HTMLElement) => void);
	onblur?: string | ((event: FocusEvent, element?: HTMLElement) => void);
	onchange?: string | ((event: Event, element?: HTMLElement) => void);
	onsubmit?: string | ((event: SubmitEvent, element?: HTMLElement) => void);
	onreset?: string | ((event: Event, element?: HTMLElement) => void);
	oninput?: string | ((event: InputEvent, element?: HTMLElement) => void);
	onselect?: string | ((event: Event, element?: HTMLElement) => void);
	onload?: string | ((event: Event, element?: HTMLElement) => void);
	onerror?: string;
}

// Element-specific attributes
interface AnchorHTMLAttributes extends GlobalHTMLAttributes {
	href?: string;
	target?: "_blank" | "_self" | "_parent" | "_top";
	rel?: string;
	download?: unknown;
	hreflang?: string;
	type?: string;
	referrerpolicy?:
		| "no-referrer"
		| "no-referrer-when-downgrade"
		| "origin"
		| "origin-when-cross-origin"
		| "unsafe-url";
	ping?: string;
}

interface ButtonHTMLAttributes extends GlobalHTMLAttributes {
	type?: "button" | "submit" | "reset";
	disabled?: boolean;
	form?: string;
	formaction?: string;
	formenctype?: string;
	formmethod?: string;
	formnovalidate?: boolean;
	formtarget?: string;
	name?: string;
	value?: string;
	autofocus?: boolean;
}

interface InputHTMLAttributes extends GlobalHTMLAttributes {
	type?:
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
		| "week";
	name?: string;
	value?: string | number;
	disabled?: boolean;
	checked?: boolean;
	placeholder?: string;
	readOnly?: boolean;
	required?: boolean;
	min?: number | string;
	max?: number | string;
	step?: number | string;
	pattern?: string;
	accept?: string;
	autocomplete?: string;
	autofocus?: boolean;
	capture?: boolean | "user" | "environment";
	dirname?: string;
	form?: string;
	formaction?: string;
	formenctype?: string;
	formmethod?: string;
	formnovalidate?: boolean;
	formtarget?: string;
	height?: number | string;
	list?: string;
	maxlength?: number;
	minlength?: number;
	multiple?: boolean;
	size?: number;
	src?: string;
	width?: number | string;
}

// Additional HTML element interfaces

interface AreaHTMLAttributes extends GlobalHTMLAttributes {
	alt?: string;
	coords?: string;
	download?: unknown;
	href?: string;
	hreflang?: string;
	media?: string;
	referrerpolicy?: string;
	rel?: string;
	shape?: "rect" | "circle" | "poly" | "default";
	target?: string;
	type?: string;
}

interface AudioHTMLAttributes extends GlobalHTMLAttributes {
	autoplay?: boolean;
	controls?: boolean;
	crossorigin?: "anonymous" | "use-credentials";
	loop?: boolean;
	muted?: boolean;
	preload?: "none" | "metadata" | "auto";
	src?: string;
}

interface BaseHTMLAttributes extends GlobalHTMLAttributes {
	href?: string;
	target?: string;
}

interface BlockquoteHTMLAttributes extends GlobalHTMLAttributes {
	cite?: string;
}

interface CanvasHTMLAttributes extends GlobalHTMLAttributes {
	height?: number | string;
	width?: number | string;
}

interface ColHTMLAttributes extends GlobalHTMLAttributes {
	span?: number;
	width?: number | string;
}

interface ColgroupHTMLAttributes extends GlobalHTMLAttributes {
	span?: number;
}

interface DataHTMLAttributes extends GlobalHTMLAttributes {
	value?: string;
}

interface DetailsHTMLAttributes extends GlobalHTMLAttributes {
	open?: boolean;
}

interface DialogHTMLAttributes extends GlobalHTMLAttributes {
	open?: boolean;
}

interface EmbedHTMLAttributes extends GlobalHTMLAttributes {
	height?: number | string;
	src?: string;
	type?: string;
	width?: number | string;
}

interface FieldsetHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: boolean;
	form?: string;
	name?: string;
}

interface FormHTMLAttributes extends GlobalHTMLAttributes {
	acceptCharset?: string;
	action?: string;
	autocomplete?: "on" | "off";
	enctype?:
		| "application/x-www-form-urlencoded"
		| "multipart/form-data"
		| "text/plain";
	method?: "get" | "post";
	name?: string;
	novalidate?: boolean;
	target?: string;
	rel?: string;
}

interface HtmlHTMLAttributes extends GlobalHTMLAttributes {
	xmlns?: string;
}

interface IframeHTMLAttributes extends GlobalHTMLAttributes {
	allow?: string;
	allowfullscreen?: boolean;
	height?: number | string;
	loading?: "eager" | "lazy";
	name?: string;
	referrerpolicy?: string;
	sandbox?: string;
	src?: string;
	srcdoc?: string;
	width?: number | string;
}

interface ImgHTMLAttributes extends GlobalHTMLAttributes {
	alt?: string;
	crossorigin?: "anonymous" | "use-credentials";
	decoding?: "sync" | "async" | "auto";
	height?: number | string;
	ismap?: boolean;
	loading?: "eager" | "lazy";
	referrerpolicy?: string;
	sizes?: string;
	src?: string;
	srcset?: string;
	usemap?: string;
	width?: number | string;
}

interface LabelHTMLAttributes extends GlobalHTMLAttributes {
	for?: string;
	form?: string;
}

interface LiHTMLAttributes extends GlobalHTMLAttributes {
	value?: number;
}

interface LinkHTMLAttributes extends GlobalHTMLAttributes {
	as?: string;
	crossorigin?: "anonymous" | "use-credentials";
	href?: string;
	hreflang?: string;
	media?: string;
	rel?: string;
	sizes?: string;
	type?: string;
}

interface MapHTMLAttributes extends GlobalHTMLAttributes {
	name?: string;
}

interface MetaHTMLAttributes extends GlobalHTMLAttributes {
	charset?: string;
	content?: string;
	httpEquiv?: string;
	name?: string;
}

interface MeterHTMLAttributes extends GlobalHTMLAttributes {
	form?: string;
	high?: number;
	low?: number;
	max?: number;
	min?: number;
	optimum?: number;
	value?: number;
}

interface ObjectHTMLAttributes extends GlobalHTMLAttributes {
	data?: string;
	form?: string;
	height?: number | string;
	name?: string;
	type?: string;
	usemap?: string;
	width?: number | string;
}

interface OlHTMLAttributes extends GlobalHTMLAttributes {
	reversed?: boolean;
	start?: number;
	type?: "1" | "a" | "A" | "i" | "I";
}

interface OptgroupHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: boolean;
	label?: string;
}

interface OptionHTMLAttributes extends GlobalHTMLAttributes {
	disabled?: boolean;
	label?: string;
	selected?: boolean;
	value?: string;
}

interface OutputHTMLAttributes extends GlobalHTMLAttributes {
	for?: string;
	form?: string;
	name?: string;
}

interface ProgressHTMLAttributes extends GlobalHTMLAttributes {
	max?: number;
	value?: number;
}

interface ScriptHTMLAttributes extends GlobalHTMLAttributes {
	async?: boolean;
	crossorigin?: "anonymous" | "use-credentials";
	defer?: boolean;
	integrity?: string;
	nomodule?: boolean;
	nonce?: string;
	src?: string;
	type?: string;
}

interface SelectHTMLAttributes extends GlobalHTMLAttributes {
	autocomplete?: string;
	autofocus?: boolean;
	disabled?: boolean;
	form?: string;
	multiple?: boolean;
	name?: string;
	required?: boolean;
	size?: number;
	value?: string;
}

interface SourceHTMLAttributes extends GlobalHTMLAttributes {
	media?: string;
	sizes?: string;
	src?: string;
	srcset?: string;
	type?: string;
}

interface StyleHTMLAttributes extends GlobalHTMLAttributes {
	media?: string;
	nonce?: string;
	scoped?: boolean;
	type?: string;
}

interface TableHTMLAttributes extends GlobalHTMLAttributes {
	cellPadding?: number | string;
	cellSpacing?: number | string;
	summary?: string;
}

interface TextareaHTMLAttributes extends GlobalHTMLAttributes {
	autocomplete?: string;
	autofocus?: boolean;
	cols?: number;
	dirname?: string;
	disabled?: boolean;
	form?: string;
	maxlength?: number;
	minlength?: number;
	name?: string;
	placeholder?: string;
	readonly?: boolean;
	required?: boolean;
	rows?: number;
	value?: string;
	wrap?: "hard" | "soft";
}

interface TdHTMLAttributes extends GlobalHTMLAttributes {
	colspan?: number;
	headers?: string;
	rowspan?: number;
}

interface ThHTMLAttributes extends GlobalHTMLAttributes {
	colspan?: number;
	headers?: string;
	rowspan?: number;
	scope?: "col" | "row" | "rowgroup" | "colgroup";
}

interface TimeHTMLAttributes extends GlobalHTMLAttributes {
	datetime?: string;
}

interface TrackHTMLAttributes extends GlobalHTMLAttributes {
	default?: boolean;
	kind?: "subtitles" | "captions" | "descriptions" | "chapters" | "metadata";
	label?: string;
	src?: string;
	srclang?: string;
}

interface VideoHTMLAttributes extends GlobalHTMLAttributes {
	autoplay?: boolean;
	controls?: boolean;
	crossorigin?: "anonymous" | "use-credentials";
	height?: number | string;
	loop?: boolean;
	muted?: boolean;
	playsinline?: boolean;
	poster?: string;
	preload?: "none" | "metadata" | "auto";
	src?: string;
	width?: number | string;
}

// Define interfaces for other elements that only use global attributes
interface DivHTMLAttributes extends GlobalHTMLAttributes {}
interface SpanHTMLAttributes extends GlobalHTMLAttributes {}
interface ParagraphHTMLAttributes extends GlobalHTMLAttributes {}
interface HeaderHTMLAttributes extends GlobalHTMLAttributes {}
interface FooterHTMLAttributes extends GlobalHTMLAttributes {}
interface MainHTMLAttributes extends GlobalHTMLAttributes {}
interface SectionHTMLAttributes extends GlobalHTMLAttributes {}
interface ArticleHTMLAttributes extends GlobalHTMLAttributes {}
interface AsideHTMLAttributes extends GlobalHTMLAttributes {}
interface NavHTMLAttributes extends GlobalHTMLAttributes {}
interface HeadingHTMLAttributes extends GlobalHTMLAttributes {}
interface HrHTMLAttributes extends GlobalHTMLAttributes {}
interface BrHTMLAttributes extends GlobalHTMLAttributes {}
interface UlHTMLAttributes extends GlobalHTMLAttributes {}

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
