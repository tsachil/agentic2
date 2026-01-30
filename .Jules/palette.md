## 2024-05-22 - MUI Grid v7 API Changes
**Learning:** MUI v7's `Grid` component (formerly Grid2) drops the `item` prop and replaces breakpoint props (`xs`, `md`) with a single `size` object prop (e.g., `size={{ xs: 12 }}`). This breaks existing layouts if not updated.
**Action:** When working with bleeding-edge MUI versions, verify Grid API syntax immediately.

## 2024-05-22 - Async Button Feedback
**Learning:** Users can easily double-submit or feel uncertain during async operations if the submit button lacks a loading state. Adding a spinner and disabled state is a high-impact, low-effort micro-interaction.
**Action:** Always wrap async form submissions in a try/finally block that toggles a `submitting` state on the primary action button.
