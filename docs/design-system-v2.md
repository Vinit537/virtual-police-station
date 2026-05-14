# Design System V2 — Civic Professional

## Token Taxonomy
- Colors: `--color-bg-*`, `--color-surface-*`, `--color-text-*`, `--color-accent*`, status colors.
- Spacing: `--space-1..8`.
- Radius: `--radius-sm..xl`, `--radius-pill`.
- Elevation: `--shadow-1..3`.
- Motion/Layering: `--focus-ring`, `--z-nav`, `--z-overlay`, `--z-modal`.

## Component Usage Rules
- Use primitives from `src/ui/DesignSystem.jsx` for all new UI.
- Keep role differentiation via semantic accents only; layout and typography remain shared.
- Prefer `PageTemplate`, `OperationalSplitTemplate`, `AuthTemplate`, `FormWizardTemplate`, `DetailTemplate` for page structure.
- Use `StatusBadge`/`PriorityBadge` maps for status and urgency rendering.

## Do / Don't
- Do: use semantic token classes/variables and shared primitives.
- Do: provide keyboard focus states, aria labels, and non-color cues.
- Don't: add new hardcoded hex colors in JSX inline style.
- Don't: introduce one-off button/input styles when primitive variants exist.

## Accessibility Checklist (WCAG 2.1 AA)
- Keyboard reachable primary actions and tab order across dashboard panes.
- Focus visible on every interactive control.
- Contrast-compliant text, badges, and alerts against their backgrounds.
- `aria-live` for asynchronous alerts/toasts.
- Skip link and semantic landmarks (`header`, `nav`, `main`, `aside`, `footer`).
- Reduced motion support via `prefers-reduced-motion`.
