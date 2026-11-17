export type NavLeaf = string | { label: string; slug: string };
export type NavGroup = { [group: string]: NavLeaf[] };
export type NavEntry = NavLeaf | NavGroup;
export type NavSection = "learn" | "reference" | "plugins" | "headless" | "ui";

export interface NavTreeNode {
  title: string;
  url?: string;
  children?: NavTreeNode[];
}

export const navigation: Record<NavSection, NavEntry[]> = {
  learn: [
    "Quick-Start",
    {
      Concepts: [
        "Reactivity",
        "Templates",
        "Attribute-Prefixes",
        "Components",
        "Control-Flow",
        "Styling",
        "State",
        "Routing",
        "Resources",
        "Error-Handling",
        "Reactive-Refs",
        "Custom-Elements",
        "SSR",
        "Hydration",
        "Headless-Utils",
        "Headless-Components",
      ],
    },
    {
      Patterns: [
        "Reactivity",
        "Rendering",
        "Styling",
        "State",
        "Routing",
        "Resource",
        "SSR",
        "Testing",
      ],
    },
    {
      "Tutorials": [
        "Counter",
        "Theme-Switcher",
        "Todo",
        "Blog",
        "SSR-Islands",
        "SSR-Routing",
        "SSR-Streaming",
        "Astro-Islands",
      ],
    }
  ],
  reference: [
    {
      core: [
        "computed",
        "effect",
        "flush",
        "scope",
        "signal",
        "signalArray",
        "signalMap",
        "signalSet",
        "untracked"
      ]
    },
    {
      css: [
        "css",
        "cssText",
        "cva",
        "cx",
        "keyframes",
        "removeCss",
        "removeKeyframes",
        "removeStyle",
        "removeVars",
        "reset",
        "resetCss",
        "resetVars",
        "style",
        "vars"
      ]
    },
    {
      dom: [
        "$collection",
        "$ref",
        { label: "e:", slug: "e" },
        "element",
        { label: "error:", slug: "error" },
        "ForEach",
        { label: "hook:", slug: "hook" },
        "hydrate",
        "Lazy",
        "mount",
        { label: "on:", slug: "on" },
        "onError",
        "Portal",
        "raw",
        "registry",
        "Suspense",
        "Transition",
      ]
    },
    {
      resource: [
        "resetresource",
        "resource",
        "resourcecache"
      ]
    },
    {
      router: [
        "href",
        "navigate",
        "resetrouter",
        "route",
        "router"
      ]
    },
    {
      ssr: [
        "doc",
        "ssr"
      ]
    },
    {
      store: [
        "localstorageadaptor",
        "persiststore",
        "sessionstorageadaptor",
        "store"
      ]
    },
  ],
  plugins: [
    "compiler",
    "rollup",
    "vite",
    "astro"
  ],
  headless: [
    {
      Config: [
        "Installation",
        "Theming"
      ]
    },
    {
      Components: [
        "accordion",
        "avatar",
        "calendar",
        "checkbox",
        "collapsible",
        "combobox",
        "command",
        "createForm",
        "dialog",
        "hoverCard",
        "inputOtp",
        "menu",
        "menubar",
        "messageScroller",
        "navigationMenu",
        "popover",
        "radioGroup",
        "scrollArea",
        "select",
        "slider",
        "tabs",
        "toast",
        "toggle",
        "toggleGroup",
        "toggleSwitch",
        "tooltip"
      ]
    },
    {
      Utils: [
        "anchorPosition",
        "computeAnchorPosition",
        "hoverIntent",
        "layerDismissal",
        "menuTypeahead",
        "modal",
        "onDoubleTap",
        "onDrag",
        "onEscape",
        "onLongPress",
        "onOutside",
        "onPinch",
        "onSwipe",
        "rovingTabIndex",
        "trapFocus"
      ]
    }
  ],
  ui: [
    {
      Config: [
        "Installation",
        "Theming",
        "CLI"
      ]
    },
    {
      Components: [
        "Accordion",
        "Alert",
        "Alert-Dialog",
        "Aspect-Ratio",
        "Attachment",
        "Avatar",
        "Badge",
        "Breadcrumb",
        "Bubble",
        "Button",
        "Button-Group",
        "Calendar",
        "Card",
        "Checkbox",
        "Collapsible",
        "Combobox",
        "Command",
        "Context-Menu",
        "Dialog",
        "Direction",
        "Drawer",
        "Dropdown-Menu",
        "Empty",
        "Field",
        "Form",
        "Hover-Card",
        "Input",
        "Input-Group",
        "Input-Otp",
        "Item",
        "Kbd",
        "Label",
        "Marker",
        "Menubar",
        "Message",
        "Message-Scroller",
        "Native-Select",
        "Navigation-Menu",
        "Pagination",
        "Popover",
        "Progress",
        "Radio-Group",
        "Resizable",
        "Scroll-Area",
        "Select",
        "Separator",
        "Sheet",
        "Sidebar",
        "Skeleton",
        "Slider",
        "Sonner",
        "Spinner",
        "Switch",
        "Table",
        "Tabs",
        "Textarea",
        "Toggle",
        "Toggle-Group",
        "Tooltip"
      ]
    },
  ],
} as const;
