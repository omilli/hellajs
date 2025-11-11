# HellaJS UI Components Roadmap

Comprehensive list of headless UI components that require JavaScript behavior. Pure CSS components (like Avatar, Breadcrumb) are excluded as they need no reactive logic.

## Priority 1: Essential Interactive Components (High Value, Medium Complexity)

### ✅ Accordion
Collapsible content sections with animated height transitions.
- `data-accordion` - Container
- `data-accordion-item` - Individual item
- `data-accordion-trigger` - Toggle button
- `data-accordion-content` - Expandable content

### Dialog (Modal)
Accessible modal dialogs with focus trap and overlay.
- `data-dialog-trigger` - Opens dialog
- `data-dialog-backdrop` - Overlay/backdrop
- `data-dialog-content` - Dialog content container
- `data-dialog-title` - Dialog title
- `data-dialog-close` - Close button

### Popover
Floating content anchored to trigger element.
- `data-popover-trigger` - Anchor element
- `data-popover-content` - Floating content
- `data-popover-close` - Close button
- `data-popover-arrow` - Optional arrow pointer

### Tooltip
Contextual information on hover/focus.
- `data-tooltip-trigger` - Element with tooltip
- `data-tooltip-content` - Tooltip text/content
- `data-tooltip-arrow` - Optional arrow

### Tabs
Organized content in tabbed interface.
- `data-tabs` - Container
- `data-tabs-list` - Tab buttons container
- `data-tabs-trigger` - Individual tab button
- `data-tabs-panel` - Tab content panel

### Disclosure (Collapsible)
Simple show/hide content toggle.
- `data-disclosure-trigger` - Toggle button
- `data-disclosure-content` - Expandable content

### Dropdown Menu
Hierarchical menu with keyboard navigation.
- `data-menu-trigger` - Opens menu
- `data-menu-content` - Menu container
- `data-menu-item` - Menu option
- `data-menu-separator` - Visual separator
- `data-menu-submenu` - Nested menu

## Priority 2: Form Components (High Value, Low-Medium Complexity)

### Switch
Toggle on/off control with smooth animation.
- `data-switch` - Container
- `data-switch-input` - Hidden checkbox
- `data-switch-thumb` - Visual indicator

### Checkbox
Multi-select with indeterminate state support.
- `data-checkbox` - Container
- `data-checkbox-input` - Hidden input
- `data-checkbox-indicator` - Visual check mark

### Radio Group
Mutually exclusive selection.
- `data-radio-group` - Container
- `data-radio-item` - Individual radio
- `data-radio-input` - Hidden input
- `data-radio-indicator` - Visual indicator

### Select
Dropdown selection with keyboard navigation.
- `data-select-trigger` - Opens dropdown
- `data-select-content` - Options container
- `data-select-option` - Individual option
- `data-select-value` - Current selection display

### Combobox
Autocomplete input with dropdown.
- `data-combobox` - Container
- `data-combobox-input` - Text input
- `data-combobox-trigger` - Dropdown toggle
- `data-combobox-content` - Options list
- `data-combobox-option` - Individual option

### Slider
Range selection with single or multiple thumbs.
- `data-slider` - Container
- `data-slider-track` - Visual track
- `data-slider-range` - Filled portion
- `data-slider-thumb` - Draggable handle

### Number Input
Numeric input with increment/decrement.
- `data-number-input` - Container
- `data-number-input-field` - Input field
- `data-number-input-increment` - Plus button
- `data-number-input-decrement` - Minus button

### Pin Input
OTP/verification code input.
- `data-pin-input` - Container
- `data-pin-input-field` - Individual digit field

### Tags Input
Multiple value input with tags.
- `data-tags-input` - Container
- `data-tags-input-field` - Input field
- `data-tags-input-tag` - Individual tag
- `data-tags-input-remove` - Remove tag button

### Rating
Star rating or custom rating system.
- `data-rating` - Container
- `data-rating-item` - Individual star/icon

## Priority 3: Advanced Interactive Components (Medium Value, Medium-High Complexity)

### Carousel
Image/content slider with navigation.
- `data-carousel` - Container
- `data-carousel-viewport` - Visible area
- `data-carousel-slide` - Individual slide
- `data-carousel-prev` - Previous button
- `data-carousel-next` - Next button
- `data-carousel-indicator` - Pagination dots

### Date Picker
Calendar date selection.
- `data-datepicker-trigger` - Opens calendar
- `data-datepicker-content` - Calendar container
- `data-datepicker-header` - Month/year navigation
- `data-datepicker-day` - Individual day
- `data-datepicker-prev` - Previous month
- `data-datepicker-next` - Next month

### Color Picker
Visual color selection interface.
- `data-colorpicker` - Container
- `data-colorpicker-trigger` - Opens picker
- `data-colorpicker-content` - Picker interface
- `data-colorpicker-swatch` - Color preview
- `data-colorpicker-input` - Hex/RGB input

### File Upload
Drag-and-drop file upload.
- `data-fileupload` - Container
- `data-fileupload-dropzone` - Drop area
- `data-fileupload-trigger` - Browse button
- `data-fileupload-item` - Uploaded file item
- `data-fileupload-remove` - Remove file

### Toast
Notification messages with auto-dismiss.
- `data-toast` - Container
- `data-toast-title` - Message title
- `data-toast-description` - Message content
- `data-toast-close` - Close button

### Context Menu
Right-click menu.
- `data-contextmenu` - Trigger area
- `data-contextmenu-content` - Menu container
- `data-contextmenu-item` - Menu option

### Hover Card
Rich preview on hover.
- `data-hovercard-trigger` - Hover target
- `data-hovercard-content` - Preview content
- `data-hovercard-arrow` - Optional arrow

### Splitter
Resizable panels.
- `data-splitter` - Container
- `data-splitter-panel` - Resizable panel
- `data-splitter-handle` - Drag handle

### Tree View
Hierarchical data navigation.
- `data-tree` - Container
- `data-tree-item` - Tree node
- `data-tree-toggle` - Expand/collapse
- `data-tree-content` - Child nodes

## Priority 4: Data Display Components (Medium Value, Low Complexity)

### Pagination
Page navigation with state management.
- `data-pagination` - Container
- `data-pagination-prev` - Previous page
- `data-pagination-next` - Next page
- `data-pagination-item` - Page number
- `data-pagination-ellipsis` - Overflow indicator

### Marquee
Scrolling text animation with pause on hover.
- `data-marquee` - Container
- `data-marquee-content` - Scrolling content

### Highlight
Text highlighting with dynamic search.
- `data-highlight` - Container with search text

## Priority 5: Utility Components (Low-Medium Value, Low-Medium Complexity)

### Scroll Area
Custom scrollbar styling.
- `data-scrollarea` - Container
- `data-scrollarea-viewport` - Scrollable area
- `data-scrollarea-scrollbar` - Scrollbar track
- `data-scrollarea-thumb` - Scrollbar handle

### Clipboard
Copy to clipboard functionality.
- `data-clipboard-trigger` - Copy button
- `data-clipboard-indicator` - Success feedback

### Editable
Inline text editing.
- `data-editable` - Container
- `data-editable-preview` - Display mode
- `data-editable-input` - Edit mode
- `data-editable-edit` - Edit button
- `data-editable-submit` - Save button
- `data-editable-cancel` - Cancel button

### Toggle Group
Multiple toggle buttons.
- `data-togglegroup` - Container
- `data-togglegroup-item` - Toggle button

### Segment Group
iOS-style segmented control.
- `data-segmentgroup` - Container
- `data-segmentgroup-item` - Segment button
- `data-segmentgroup-indicator` - Visual highlight

### Timer
Countdown/countup timer with controls.
- `data-timer` - Container
- `data-timer-display` - Time display
- `data-timer-start` - Start button
- `data-timer-pause` - Pause button
- `data-timer-reset` - Reset button

### Presence
Animated mount/unmount transitions for conditional content.
- `data-presence` - Animated element

### Portal
Teleport content to different DOM location (modals, tooltips).
- `data-portal` - Portal target
- `data-portal-content` - Content to teleport

### Focus Trap
Lock keyboard focus within element (dialogs, menus).
- `data-focustrap` - Container

## Implementation Notes

### Data Attribute Convention
All components use the pattern `data-{component}-{part}` for maximum clarity and ease of use.

### Component States
Common states handled via aria attributes:
- `aria-expanded` - Open/closed state
- `aria-selected` - Selection state
- `aria-disabled` - Disabled state
- `aria-checked` - Checked state

### Accessibility First
- Full keyboard navigation
- Screen reader support
- Focus management
- ARIA attributes

### Reactive Core
All components built on HellaJS reactive primitives:
- `signal()` for state
- `effect()` for side effects
- `computed()` for derived state

### Zero Styles
Components provide behavior only. Users bring their own styles via CSS/Tailwind/CSS-in-JS.

## Suggested Implementation Order

### Phase 1: Foundation (2-3 weeks)
1. ✅ Accordion
2. Dialog
3. Popover
4. Tooltip
5. Tabs
6. Disclosure

### Phase 2: Forms (2-3 weeks)
7. Switch
8. Checkbox
9. Radio Group
10. Select
11. Slider
12. Number Input

### Phase 3: Advanced Forms (2-3 weeks)
13. Combobox
14. Tags Input
15. Pin Input
16. Rating
17. Date Picker
18. File Upload

### Phase 4: Data & Navigation (1-2 weeks)
19. Dropdown Menu
20. Context Menu
21. Pagination
22. Marquee
23. Highlight

### Phase 5: Advanced Interactions (3 weeks)
24. Carousel
25. Color Picker
26. Tree View
27. Splitter
28. Toast
29. Hover Card

### Phase 6: Utilities (1-2 weeks)
30. Scroll Area
31. Clipboard
32. Editable
33. Toggle Group
34. Segment Group
35. Timer
36. Presence
37. Portal
38. Focus Trap

Total: 38 components (removed 4 pure-CSS components: Avatar, Breadcrumb, Steps, Progress, QR Code)
Timeline: ~13-15 weeks of focused development
