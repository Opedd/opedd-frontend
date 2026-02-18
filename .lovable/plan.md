

# Opedd UI Refinement: B2B Infrastructure Polish

CSS/Tailwind-only changes. Zero modifications to any functions, state, API calls, imports, variable names, or component structure. Every file keeps its exact same logic and layout.

---

## 1. Global Border Radius: The 6px Rule

**`tailwind.config.ts`** -- Change `--radius` base value:
- In `src/index.css`: change `--radius: 0.75rem` to `--radius: 0.375rem` (6px)

This cascades automatically to all shadcn components (buttons, inputs, cards, selects, badges, dialogs, popovers, etc.) since they use `rounded-lg`, `rounded-md`, `rounded-sm` which reference `--radius`.

**Manual overrides** in page files -- find-and-replace:
- `rounded-xl` to `rounded-md`
- `rounded-2xl` to `rounded-md`
- `rounded-[2rem]` to `rounded-md`
- `rounded-full` on non-avatar/non-dot elements to `rounded-md`

Applies across: Dashboard.tsx, Ledger.tsx, Insights.tsx, Integrations.tsx, Settings.tsx, DashboardSidebar.tsx, MobileSidebar.tsx, DashboardHeader.tsx, MetricCard.tsx, button.tsx

---

## 2. Typography Tightening

Across all 5 page files, change only class strings:

| Element | Before | After |
|---------|--------|-------|
| Page titles (h1) | `text-2xl font-bold` | `text-lg font-semibold` |
| Section headings (h2) | `text-lg font-bold` | `text-sm font-semibold` |
| Metric card values | `text-3xl font-bold` | `text-xl font-semibold` |
| Page subtitles (p) | `text-sm` | `text-xs` |
| MetricCard value | `text-5xl font-bold` | `text-2xl font-semibold` |

---

## 3. Spacing Compression

Across all page files, change only class strings:

- `space-y-8` to `space-y-5`
- `space-y-10` to `space-y-6`
- `p-8` to `p-5`
- `pt-8` to `pt-5`
- `p-6` to `p-4` (on inner card sections)
- `gap-5` to `gap-4`
- `mb-4` to `mb-3` (where appropriate)
- MetricCard: `p-8` to `p-4`

---

## 4. Shadows to Borders

Remove shadow classes and replace with thin borders:

- Remove `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` from dashboard cards
- Keep only `border border-gray-200` (already present on most cards)
- Remove the gradient blur orbs: delete `bg-[#4A26ED]/20 rounded-full blur-3xl` divs (the absolute-positioned decorative elements in Ledger and Insights metric cards)
- Remove `shadow-lg shadow-[#4A26ED]/20` from the Register Content button in Dashboard

---

## 5. Hover Precision

In `button.tsx` variants and page inline styles:
- Replace `hover:-translate-y-0.5` and `hover:-translate-y-1` with nothing (remove)
- Replace `hover:scale-105` with nothing (remove)
- Replace `active:scale-[0.98]` with nothing (remove)
- Replace `hover:shadow-lg` / `hover:shadow-xl` / `hover:shadow-md` with `hover:border-gray-300` where on cards
- Keep `transition-colors` instead of `transition-all` where transforms are removed

MetricCard: remove `group-hover:scale-105 transition-transform origin-left`

---

## 6. Page Title Icons

Across Ledger, Insights, Integrations pages -- the 48px gradient icon containers:
- Change `w-12 h-12` to `w-5 h-5`
- Remove the gradient background classes (`bg-gradient-to-br from-[#4A26ED]/10 to-[#7C3AED]/10 rounded-xl flex items-center justify-center`)
- Icon size: change `size={24}` to `size={18}`
- Remove the wrapper div, leave just the icon inline next to the heading

---

## 7. Sidebar Slimming

**DashboardSidebar.tsx:**
- `w-60` to `w-52`
- Nav items: `px-3 py-2.5` to `px-3 py-2`
- Icon size: `size={20}` to `size={18}`
- Active state: add `border-l-2 border-white` class; inactive: `border-l-2 border-transparent`

**MobileSidebar.tsx:**
- `w-72` to `w-64`
- Nav items: `px-4 py-3` to `px-3 py-2`
- Icon size: `size={20}` to `size={18}`

---

## 8. Tab Controls

In Dashboard.tsx tab section:
- TabsList: `rounded-xl` to `rounded-md`, `p-1` stays
- TabsTrigger: `rounded-lg` to `rounded`, `px-5 py-2` to `px-3 py-1.5`, `text-sm` to `text-xs`

---

## 9. Metric Cards Uniformity

**Ledger.tsx & Insights.tsx** -- the dark navy "Total Revenue" hero card:
- Change from `bg-gradient-to-br from-[#040042] to-[#1a1a5c]` to `bg-white border border-gray-200`
- Text colors: `text-white` to `text-[#040042]`, `text-white/70` to `text-[#040042]/50`
- Remove `shadow-xl`
- Remove the blur orb div inside it

This makes all metric cards uniform white modules.

**MetricCard.tsx:**
- `p-8 rounded-[2rem] shadow-lg hover:shadow-xl` to `p-4 rounded-md border border-gray-200`
- Value: `text-5xl` to `text-2xl`
- Label: `mb-3` to `mb-1`

---

## 10. Data Table Rows

Already using shadcn Table which has hover states. Ensure:
- Ledger transaction rows: verify `hover:bg-gray-50` is present (add if missing)
- Insights top articles table: same treatment

---

## Files Modified (CSS classes only, zero logic changes)

1. `src/index.css` -- `--radius` value
2. `src/components/ui/button.tsx` -- remove translate/scale transforms from variants
3. `src/components/dashboard/MetricCard.tsx` -- sizing and radius
4. `src/components/dashboard/DashboardSidebar.tsx` -- width and spacing
5. `src/components/dashboard/MobileSidebar.tsx` -- width and spacing
6. `src/components/dashboard/DashboardHeader.tsx` -- minor radius updates
7. `src/pages/Dashboard.tsx` -- typography, spacing, radius, shadows
8. `src/pages/Ledger.tsx` -- typography, spacing, radius, shadows, uniform cards
9. `src/pages/Insights.tsx` -- typography, spacing, radius, shadows, uniform cards
10. `src/pages/Integrations.tsx` -- typography, spacing, radius, page header icon
11. `src/pages/Settings.tsx` -- typography, spacing, radius

