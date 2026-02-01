## 2024-05-22 - MUI Grid v7 API Changes
**Learning:** MUI v7's `Grid` component (formerly Grid2) drops the `item` prop and replaces breakpoint props (`xs`, `md`) with a single `size` object prop (e.g., `size={{ xs: 12 }}`). This breaks existing layouts if not updated.
**Action:** When working with bleeding-edge MUI versions, verify Grid API syntax immediately.

## 2024-05-22 - Async Button Feedback
**Learning:** Users can easily double-submit or feel uncertain during async operations if the submit button lacks a loading state. Adding a spinner and disabled state is a high-impact, low-effort micro-interaction.
**Action:** Always wrap async form submissions in a try/finally block that toggles a `submitting` state on the primary action button.

## 2025-02-17 - Disabled Spinner Contrast
**Learning:** Using `color="inherit"` on a spinner inside a disabled button results in low contrast (grey on grey/light grey), making it hard to see.
**Action:** Use a specific color for the spinner or use a dedicated loading button component that handles contrast correctly in disabled states.

## 2025-02-18 - Tooltips on Disabled Elements
**Learning:** Tooltips do not trigger on disabled buttons because disabled elements don't fire mouse events. This prevents users from learning *why* an action is disabled.
**Action:** Always wrap disabled buttons in a `<span>` or `<div>` to capture the hover event for the Tooltip.
