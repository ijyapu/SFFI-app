@AGENTS.md

# SSFI ERP — Claude Project Guide

## Project Overview
Enterprise Resource Planning system for **Shanti Special Food Industry Pvt. Ltd.** (Nepal).
Internal tool — not a public product. All users require admin approval after sign-in.

## Tech Stack
| Layer | Library | Version |
|-------|---------|---------|
| Framework | Next.js (App Router) | 16.2.1 |
| UI | shadcn/ui + Tailwind CSS | v4 |
| Auth | Clerk | v7 |
| Database | PostgreSQL via Supabase | — |
| ORM | Prisma | v5 |
| Storage | Supabase Storage (proof photos) | — |
| Email | Resend (`onboarding@resend.dev` sender) | v6 |
| Forms | react-hook-form + zod v4 | — |
| Toast | sonner | — |
| Charts | recharts | — |

## Key Architecture Rules
- **App Router only** — no Pages Router. All routes under `src/app/`.
- **Server Actions** — mutations use `"use server"` actions, never API routes for internal data.
- **Soft deletes** — records are never hard-deleted. Use `deletedAt: new Date()` and filter `deletedAt: null` in queries.
- **Role-based access** — roles stored in Clerk `publicMetadata.role`. Values: `admin`, `manager`, `accountant`, `staff`. Check with `useRole()` hook or `currentUser()` in server actions.
- **Auth flow** — sign-in → `/auth-callback` → role check → redirect. Pending users see a waiting screen.

## Module Structure
```
src/app/(dashboard)/
  dashboard/        # Overview cards + revenue chart
  inventory/        # Products, stock levels, reorder, adjustments
  purchases/        # Purchase orders + invoices + supplier payments
  purchases/suppliers/
  sales/            # Sales orders + customer payments
  sales/customers/
  expenses/         # Expense tracking
  employees/        # Employee profiles + salary withdrawals
  payroll/          # Payroll runs + deduction dialogs
  reports/          # Aging, stock valuation, receivables, payables
  profit-loss/      # P&L statement
  costing/          # Product margin analysis
  settings/         # Users, categories, units, audit log, access requests
```

## Database Conventions
- All monetary values: `Decimal @db.Decimal(10, 2)` — convert with `Number()` before use in JS.
- All quantity values: `Decimal @db.Decimal(10, 3)`.
- Timestamps: `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, `deletedAt DateTime?`.
- IDs: `@id @default(cuid())`.
- Stock is tracked via `StockMovement` records — never update `currentStock` directly, always use `applyStockMovement()` from `src/lib/stock.ts`.

## Reusable Patterns

### Sorting
Every data table uses the same sorting pattern:
```tsx
import { useSortable, compareValues } from "@/hooks/use-sortable";
import { SortButton } from "@/components/ui/sort-icon";

const { sortKey, sortDir, toggle } = useSortable("defaultColumn");
const sorted = useMemo(() => [...rows].sort((a, b) =>
  compareValues(a[sortKey], b[sortKey], sortDir)
), [rows, sortKey, sortDir]);

// In header:
<TableHead><SortButton col="name" label="Name" {...{ sortKey, sortDir, toggle }} /></TableHead>
// For numeric columns (right-aligned):
<TableHead numeric><SortButton col="amount" label="Amount" {...sp} className="justify-end" /></TableHead>
```
- If a component has an existing `toggle` function, destructure as `toggle: sortToggle` to avoid naming conflicts.
- Never call `useMemo` inside a `.map()` — use a plain helper function instead.

### Numeric Table Columns
`TableHead` and `TableCell` accept a `numeric` boolean prop that applies `text-right tabular-nums`:
```tsx
<TableHead numeric>Total (Rs)</TableHead>
<TableCell numeric>{amount.toFixed(2)}</TableCell>
```
Always use `numeric` for amounts, quantities, and counts — never manually add `text-right tabular-nums` to className.

### Forms
- Validators live in `src/lib/validators/` — one file per domain.
- Uses `zod` v4 (`import { z } from "zod/v4"` in client components, `import { z } from "zod"` in server actions).
- Number inputs must use `value={field.value === 0 ? "" : field.value}` to prevent "078" prefix bug.
- Inline "add new" dialogs exist for Supplier and Product within the purchase form.

### SKU Auto-Generation
When creating a product inline (via purchase form), SKU is auto-generated:
- Prefix = first 3 letters of category name (uppercase, non-alpha → "X")
- Number = highest existing SKU number for that prefix + 1 (zero-padded to 3 digits)
- Example: category "Cakes" → `CAK-001`, `CAK-002`, etc.

### Photo Uploads
Use `<PhotoUpload>` component from `src/components/ui/photo-upload.tsx`. Uploads to Supabase Storage. Returns a URL string.

## UI Conventions
- **Header**: sticky, `z-50`, shows breadcrumb + notification bell + user button.
- **Sidebar**: collapsible, uses shadcn `SidebarProvider`.
- **Tables**: always wrapped in `<div className="rounded-lg border overflow-x-auto">`.
- **Empty states**: `<TableCell colSpan={N} className="text-center py-12 text-muted-foreground">`.
- **Badges**: use semantic colors — green=success/paid, amber=draft/warning, orange=partial/credit, red=cancelled/destructive.
- **Toasts**: `toast.success(...)` on success, `toast.error(e instanceof Error ? e.message : "Fallback")` on error.
- **Delete confirmations**: always use `AlertDialog` — never delete on single click.

## Environment Variables (`.env.local`)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL          # pooled (runtime)
DIRECT_URL            # direct (migrations only)
RESEND_API_KEY
ADMIN_EMAIL=shrestha.bikas23@gmail.com
NEXT_PUBLIC_APP_URL=http://localhost:3000
CLERK_WEBHOOK_SECRET
```

## Common Commands
```bash
npm run dev           # start dev server
npm run build         # prisma generate + next build
npm run db:migrate    # run migrations (uses DIRECT_URL)
npm run db:studio     # open Prisma Studio
npm run db:seed       # seed database
```

## Known Gotchas
- **Clerk v5+**: `afterSignInUrl` / `afterSignUpUrl` props removed from `<ClerkProvider>` — use `forceRedirectUrl` on `<SignIn>` instead.
- **Zod v4**: error messages use `error:` not `message:` in schema definitions.
- **Decimal fields**: always wrap Prisma Decimal values with `Number()` before arithmetic or display.
- **`useMemo` in maps**: not allowed — extract sort/filter logic to a plain function above the render.
- **`toggle` naming**: `useSortable` exports `toggle` — rename if the component already uses that identifier.
- **Resend sender**: currently `onboarding@resend.dev` (no custom domain yet). Only delivers to the registered Resend account email in test mode.
