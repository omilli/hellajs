# @hellajs/ui

A collection of reactive UI components built with HellaJS.

## Installation

```bash
npm install @hellajs/ui @hellajs/core @hellajs/css @hellajs/dom
```

## Features

- Reactive UI components with HellaJS primitives
- CSS-in-JS styling with @hellajs/css
- Theme support with light/dark mode
- Customizable color palettes
- Zero runtime dependencies (peer dependencies only)

## Components

### Buttons
- `button` - Base button styles
- `buttonColor` - Colored button variants
- `buttonOutline` - Outlined button style
- `buttonSoft` - Soft button style
- `buttonRounded` - Rounded button variant
- `buttonFull` - Full-width button
- `buttonIcon` - Icon button style
- `buttonScale` - Size variants (sm/lg)
- `buttonModule` - Complete button system

### Inputs
- `input` - Base input styles
- `inputOutline` - Outlined input variant
- `inputFilled` - Filled input variant
- `inputUnderline` - Underline input style
- `inputRounded` - Rounded input corners
- `inputScale` - Size variants (sm/lg)
- `textarea` - Textarea styles
- `inputModule` - Complete input system

### Select
- `select` - Base select styles
- `selectOutline` - Outlined select variant
- `selectFilled` - Filled select variant
- `selectRounded` - Rounded select corners
- `selectScale` - Size variants (sm/lg)
- `selectModule` - Complete select system

### Checkbox & Radio
- `checkbox` - Checkbox styles
- `checkboxColor` - Colored checkbox variants
- `checkboxScale` - Size variants (sm/lg)
- `radio` - Radio button styles
- `checkboxLabel` - Label styles
- `checkboxModule` - Complete checkbox system

### Switch
- `switchToggle` - Toggle switch styles
- `switchColor` - Colored switch variants
- `switchScale` - Size variants (sm/lg)
- `switchLabel` - Switch label styles
- `switchModule` - Complete switch system

### Labels
- `label` - Base label styles
- `labelRequired` - Required field indicator
- `helperText` - Helper text styles
- `errorText` - Error message styles
- `successText` - Success message styles
- `labelModule` - Complete label system

### Table
- `table` - Base table styles
- `tableContainer` - Table wrapper
- `tableStriped` - Striped rows
- `tableBordered` - Bordered table
- `tableBorderedCells` - Cell borders
- `tableHover` - Hover effects
- `tableCompact` - Compact spacing
- `tableSticky` - Sticky header
- `tableColor` - Colored table variants
- `tableScale` - Size variants (sm/lg)
- `tableModule` - Complete table system

### Tabs
- `tabList` - Tab list container
- `tab` - Individual tab styles
- `tabPanel` - Tab panel content
- `tabColor` - Colored tab variants
- `tabUnderline` - Underline tab style
- `tabPills` - Pill-style tabs
- `tabPillsColor` - Colored pill tabs
- `tabPillsColorUnselected` - Unselected pill colors
- `tabBordered` - Bordered tabs
- `tabListBordered` - Bordered tab list
- `tabPanelBordered` - Bordered tab panel
- `tabScale` - Size variants (sm/lg)
- `tabsModule` - Complete tabs system

### Modal
- `modalModule` - Complete modal system with dialog, header, body, footer

### Theme & Colors
- `palette` - Create custom color palette
- `activeTheme` - Current theme signal
- `isDarkTheme` - Computed dark mode state
- `colors` - Default color palette
- `colorKeys` - Available color keys
- `paletteKeys` - Monochrome shade keys

### Utilities
- `size` - Size helper function
- `scale` - CSS variables for scaling

## Usage

```tsx
import { mount } from "@hellajs/dom";
import { buttonModule, colors, colorKeys } from "@hellajs/ui";

// Initialize button system with color palette
buttonModule(colorKeys);

// Use button styles in components
mount(() => {
  return <button class={button()}>Click me</button>;
});
```

## Theming

```tsx
import { palette, activeTheme, isDarkTheme } from "@hellajs/ui";

// Create custom palette
const myColors = palette({
  neutral: "#737b8c",
  primary: "#1260e6",
  accent: "#e67112"
});

// Toggle theme
activeTheme.set("dark");
```

## License

MIT
