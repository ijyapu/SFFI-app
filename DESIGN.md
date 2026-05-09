# Design

## Visual Theme

Restrained product dashboard. White card surfaces, 1px neutral borders, strong tabular typography for financial data. Inspired by Stripe Dashboard and Linear — information-dense but spacious. No decorative shadows, gradients, or glassmorphism. Every color token has a specific semantic job.

## Color Palette

| Role | Tailwind / CSS | Usage |
|---|---|---|
| Canvas | `bg-background` | Page background |
| Surface | `bg-card` | Cards, panels, tables |
| Border | `border` | Dividers, card outlines |
| Primary text | `text-foreground` | Headings, key labels |
| Secondary text | `text-muted-foreground` | Descriptions, metadata, table headers |
| Inflow | `text-green-700` / `text-emerald-700` | Cash in, positive deltas |
| Outflow | `text-red-700` | Cash out, negative deltas |
| Warning | `text-amber-700` | Partial payments, pending obligations |
| Accent | `text-primary` | Primary interactive states only |

Color strategy: **Restrained**. Single accent for actions. Green/red/amber reserved for semantic financial direction. No decorative color fills on cards.

## Typography

System sans-serif stack (`system-ui, -apple-system, sans-serif`). Consistent and readable at all sizes.

| Context | Size | Weight | Notes |
|---|---|---|---|
| Page heading | `text-2xl` | `font-semibold` | |
| Section heading | `text-lg` | `font-semibold` | |
| KPI value | `text-2xl` | `font-bold tabular-nums` | Always tabular-nums |
| Table header | `text-xs` | `font-medium text-muted-foreground` | Uppercase tracking optional |
| Table cell | `text-sm` | `font-normal` | |
| Financial cell | `text-sm` | `font-semibold tabular-nums` | All Rs amounts |
| Metadata | `text-xs` | `font-normal text-muted-foreground` | Dates, counts, secondary info |

## Components

**Cards**: `rounded-lg border bg-card` — no shadow. Use `px-4 py-3` for compact cards, `p-6` for content cards. Never nest cards inside cards.

**Badges**: Inline pill labels. Semantic color fills: `bg-emerald-100 text-emerald-700` (inflow), `bg-red-100 text-red-700` (outflow), `bg-amber-100 text-amber-700` (warning), `bg-slate-100 text-slate-700` (neutral).

**Tables**: `rounded-lg border overflow-hidden`. Header row: `bg-muted/30`. Row hover: `bg-muted/30 transition-colors`. Zebra striping: not used.

**Info callouts**: Icon + muted text inline. Use `text-muted-foreground` with a small icon. No colored background boxes.

**Progress bars**: `h-1.5 rounded-full bg-muted`. Fill: `bg-amber-500`. No animation.

**Expandable rows**: Chevron icon (`ChevronRight`) rotates 90deg on expand. Content fades + slides in from top. 150ms ease-out.

## Motion

Sparse. Only state-communication animations.

| Trigger | Animation | Duration | Easing |
|---|---|---|---|
| Row expand | Chevron rotates 90deg | 150ms | `cubic-bezier(0.23, 1, 0.32, 1)` |
| Content reveal | `fade-in + slide-in-from-top-1` | 150ms | ease-out |
| Button press | `scale(0.97)` | 100ms | ease-out |
| Hover | Background tint | 120ms | ease |

`prefers-reduced-motion`: remove transform animations, keep opacity/color transitions.

## Layout

- Page content: `space-y-6` vertical rhythm
- Summary cards: `grid grid-cols-2 sm:grid-cols-4 gap-3`
- Expandable table: full-width, contained in `rounded-lg border overflow-hidden`
- Inner expansion: `px-8 pb-4` with `space-y-3`
