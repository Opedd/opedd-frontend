

# Publisher Portal UX Polish — MVP Approved Scope

Implementation plan based on the audit, with your modifications. Backend-safe; no schema changes.

---

## 1. Settings — 7 tabs → 5 tabs

**File**: `src/pages/Settings.tsx`

- Remove the **AI Licensing** tab trigger and content entirely (already a redirect card — drop it).
- Remove the **Content** tab; move *Categories / Expertise summary* fields into the **Profile** tab as a "Content metadata" subsection.
- Remove the **Pricing** tab; replace with an inline link card on Profile: "Pricing is configured per license type → Configure on /licensing".
- Rename **API Keys** tab → **Developers** (label + value `developers`; keep `?tab=api-keys` working via alias for back-compat).
- Remove the in-tab **Admin** section. `/admin` already exists with `requireAdmin`.
- Final 5 tabs: **Profile · Billing · Team · Developers · Account**.
- Make `TabsList` horizontally scrollable on <768px (`overflow-x-auto`, `whitespace-nowrap`).

---

## 2. Dashboard — banner priority + quick actions + zero-state cleanup

**File**: `src/pages/Dashboard.tsx`

**Banner priority system** — render only the highest-priority banner at a time, in this order:
1. Stripe KYC pending (blocks payouts) — highest
2. Held Payments warning
3. Verification Pending
4. Onboarding Checklist (only when `setup_complete === false`)
5. Pending Earnings card (only when there *are* pending earnings)

Implement via a small `useMemo` that picks the first matching banner; render others as `null`.

**Zero-state cleanup**:
- Hide "Pending Earnings" card when `totalRevenue === 0` AND `pendingEarnings === 0` AND no licenses sold.
- Articles metric subtext: "Not yet licensed" → "Awaiting first license".

**Quick actions strip** (post-onboarding only — render when `setup_complete && hasArticles`):
- Horizontal strip below metrics, above Recent Sales.
- 4 actions: *Issue archive license · Update pricing · Invite team · View public page*.
- Each is a small card (icon + label + arrow), navigates to the right route/modal.

---

## 3. Content — collapse tabs to header dropdown

**File**: `src/pages/Content.tsx`

- Remove the 3-tab structure. Keep "Articles" as the single page body.
- Move "Re-import Archive" and "Archive License" into a header **Actions** dropdown (DropdownMenu) with items:
  - **Import articles** (was "Re-import Archive")
  - **Issue archive license** (was "Archive License")
- Page H1 stays "Catalog" to match sidebar label.

---

## 4. Insights — hide zero-state metric cards

**File**: `src/pages/Insights.tsx`

- When `!hasData` (no revenue, no transactions): hide the Total Revenue + Total Transactions metric cards entirely. Show only the empty state.
- When data exists, render as today.

---

## 5. Licensing — sticky save bar + grouping

**File**: `src/pages/Licensing.tsx`

- Add a **sticky footer bar** that appears when `hasUnsavedChanges === true`:
  - Fixed bottom, full width within the page container, white bg, top border, shadow.
  - Contains: "You have unsaved changes" + **Discard** + **Save changes** buttons.
  - Mobile-safe (respects safe-area-inset-bottom).
- Group the 6 license type cards into 2 sections with subheadings:
  - **Direct sales** — Editorial, Archive, Corporate
  - **AI & Distribution** — AI Retrieval & Summarization, AI Training, Syndication

---

## 6. Setup — Step 4 "Test webhook" button + WordPress copy fix

**File**: `src/pages/Setup.tsx`

- **WordPress platform card** description: replace "automatic, no credentials needed" with "Connect with your site URL + Application Password".
- **Step 4 — Publish Webhook card**: add a **Test webhook** button next to the API key field.
  - On click: POST a sample payload to `/platform-webhook` with the publisher's API key, show inline green ✓ "Webhook reachable" or red ✗ with error message.
  - Button uses `<Spinner>` + `disabled` while in-flight.
- **Step 4 — Email Sync card**: keep existing "Skip for now" / checkbox flow as-is.

---

## 7. Notifications — date grouping

**File**: `src/pages/NotificationsPage.tsx`

- Group notifications by date bucket: **Today · Yesterday · This week · Older**.
- Render bucket header (small uppercase label) above each group.
- Skip empty buckets.

---

## 8. Naming consistency — H1s match sidebar labels

**Sidebar labels (canonical)**: Dashboard · Catalog · Licensing · **Ledger** · Analytics · Distribution · Settings.

Changes:
- `src/components/dashboard/DashboardSidebar.tsx`: rename **Buyers** → **Ledger** (revert per your call — no buyer-grouped rebuild).
- `src/pages/Connectors.tsx`: H1 → **Distribution** (currently "Connectors").
- `src/pages/Insights.tsx`: H1 → **Analytics** (currently "Insights").
- `src/pages/Content.tsx`: H1 → **Catalog**.
- `src/pages/Ledger.tsx`: H1 stays **Ledger**.

---

## 9. Mobile responsive pass

Touch every page once at 390×844:

- **`/content`** table: wrap in `overflow-x-auto`; ensure action buttons stack on <640px.
- **`/ledger`** table: same overflow wrapper; collapse status/type filter chips into a single "Filters" sheet on mobile.
- **`/insights`** charts: replace fixed pie chart `200×200` with `<ResponsiveContainer>`; bar chart already responsive — verify.
- **`/distribution`** webhook configured-state buttons: collapse 3 inline buttons to a "..." dropdown menu on mobile.
- Verify no horizontal page overflow on any audited route.

---

## Out of scope (deferred per your call)

- Buyer-centric grouped view on `/ledger` (rename only).
- "Compared to peers" benchmark, PDF export, RSS tab, notification preferences, server-side setup_step.

---

## Order of execution (when approved)

1. Naming + Sidebar rename (touches many test selectors — do first, run typecheck)
2. Settings tab consolidation
3. Dashboard banner priority + quick actions + zero-state
4. Licensing sticky save + grouping
5. Content tab → dropdown
6. Insights zero-state hide
7. Setup Step 4 test button + WordPress copy
8. Notifications date grouping
9. Mobile pass

Each step keeps `usePlans()` for any pricing copy, brand tokens (`#4A26ED`, `#040042`), strict TS, and existing route protection (`requireAdmin` on `/admin`).

