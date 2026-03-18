# Opedd Publisher Lifecycle QA — State Transition Audit

> Senior QA Architect review. Traces every UI element from account creation to active publisher.
> All file:line references are to `src/` in `opedd-frontend`.

---

## 1. State Definitions

| State | Trigger | DB Signals |
|-------|---------|-----------|
| `NEW_USER` | Email verified, session created | `publishers` row exists, no content sources, no Stripe |
| `IN_ONBOARDING` | User enters dashboard for first time | `rss_sources.count = 0` OR `stripe_onboarding_complete = false` |
| `SETUP_COMPLETE` | All 3 checklist items done | `assets.count > 0` + `stripe_onboarding_complete = true` + `rss_sources.count > 0` |
| `ACTIVE_PUBLISHER` | Dismissed completion state | Same as SETUP_COMPLETE + localStorage flag set |

---

## 2. State Transition Matrix

### Transition 1: `NEW_USER → IN_ONBOARDING`

**Trigger:** First navigation to `/dashboard` after email confirmation.

| UI Element | Expected Action | Actual Behaviour | Status |
|------------|----------------|-----------------|--------|
| `ReferralStep` | Shown if `referral_source` is null AND `hasActivePublication = false` | Shown correctly, blocks dashboard content | ✅ |
| `PublicationSetupFlow` | Shown after referral if `hasActivePublication = false` | Shown after `setNeedsReferral(false)` | ✅ |
| `OnboardingChecklist` | Hidden (user is in setup flow, not main dashboard yet) | **Never rendered while `showSetupFlow=true`** | ✅ |
| `SetupBanner` | Hidden (no completion state yet) | `setupCompletion` defaults to `{pricingDone:true, widgetDone:true}` → banner hidden | ✅ |
| Dashboard metrics | Hidden | Replaced by `PublicationSetupFlow` full-screen | ✅ |

**Issues at this transition:** None critical. See Zombie #3 for ReferralStep re-entry.

---

### Transition 2: `IN_ONBOARDING → SETUP_COMPLETE`

**Trigger:** User completes all 3 `OnboardingChecklist` steps.

| UI Element | Expected Action | Actual Behaviour | Status |
|------------|----------------|-----------------|--------|
| `PublicationSetupFlow` | Destroyed | Replaced by dashboard after `hasActivePublication=true` | ✅ |
| `OnboardingChecklist` | Shows "You're all set!" then waits for Dismiss click | **Persists until manual Dismiss** — no auto-destroy | 🧟 ZOMBIE #1 |
| `SetupBanner` | Hidden (all steps done = `showBanner=false`) | Correctly hidden after completion callback | ✅ |
| `ReferralStep` | Permanently gone | Gone because `hasActivePublication=true` | ✅ |

---

### Transition 3: `SETUP_COMPLETE` + Page Refresh

**Trigger:** Publisher refreshes `/dashboard` after completing all onboarding steps.

| UI Element | Expected Action | Actual Behaviour | Status |
|------------|----------------|-----------------|--------|
| `PublicationSetupFlow` | Gone — `hasActivePublication` re-fetched from DB | Correctly hidden (DB has active rss_source) | ✅ |
| `OnboardingChecklist` | Gone — all steps complete | **Reappears with all 3 checks re-fetched (shows "You're all set!" again)** until Dismiss was previously clicked | 🧟 ZOMBIE #1 |
| `SetupBanner` | Gone — setup is complete | `setupCompletion` resets to `{pricingDone:true, widgetDone:true}` on refresh → banner hidden. BUT: if setup was incomplete (no pricing), banner stays hidden too | 🧟 ZOMBIE #2 |
| `ReferralStep` | Gone — `hasActivePublication=true` | Correctly gone | ✅ |

---

### Transition 4: `SETUP_COMPLETE → ACTIVE_PUBLISHER`

**Trigger:** Publisher clicks "Dismiss" on the "You're all set!" banner.

| UI Element | Expected Action | Actual Behaviour | Status |
|------------|----------------|-----------------|--------|
| `OnboardingChecklist` | Permanently hidden | Hidden via `localStorage.setItem(DISMISS_KEY, "true")` — survives refresh | ✅ |
| Dashboard metrics | Always visible | Correct | ✅ |
| Action cards (Embed, Archive) | Visible | Correct | ✅ |
| `ImportProgressBanner` | Polls until `done` then auto-dismisses | Correct — uses 5s polling with auto-clear | ✅ |

---

## 3. Zombie Element Register

### 🧟 ZOMBIE #1 — OnboardingChecklist success state persists between sessions

**File:** `src/components/dashboard/OnboardingChecklist.tsx:131`
**Code:**
```typescript
if (allDone && dismissed) return null;   // only hides after BOTH conditions
if (allDone) return <PartyPopper banner ... />  // shows on every refresh
```
**Problem:** When all 3 steps are complete (`allDone=true`) and the user **has not clicked Dismiss**, the "You're all set!" banner appears on every page refresh. The component re-fetches all three conditions fresh from DB/API on every mount.
**Impact:** Medium. Publisher refreshes the dashboard and sees a stale onboarding success message indefinitely.
**Fix:** Auto-set `dismissed=true` (and write `localStorage`) as soon as `allDone` is detected on mount, without requiring explicit user action.

```typescript
// In useEffect after fetchState() resolves:
useEffect(() => {
  if (completedCount === totalCount && !dismissed) {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, "true");
  }
}, [completedCount, totalCount, dismissed]);
```

---

### 🧟 ZOMBIE #2 — SetupBanner invisible for users with genuinely incomplete setup after refresh

**File:** `src/pages/Dashboard.tsx:40`, `Dashboard.tsx:111`
**Code:**
```typescript
const [setupCompletion, setSetupCompletion] = useState<...>({
  pricingDone: true,   // ← defaults to "done"
  widgetDone: true,    // ← defaults to "done"
});
```
**Problem:** `SetupBanner` only renders when `showBanner = !pricingDone || !widgetDone`. But `setupCompletion` starts as `{ pricingDone: true, widgetDone: true }` on every mount. The banner only appears if `PublicationSetupFlow.onComplete` was called with explicit completion state in the **current session**. On refresh, an active publisher with no pricing set will never see the "Set your rates" nudge again.
**Impact:** High. Core monetisation prompt becomes invisible after the first session.
**Fix:** Fetch actual pricing state from publisher-profile on Dashboard mount and populate `setupCompletion` from the real data.

---

### 🧟 ZOMBIE #3 — ReferralStep blocks new users with no skip option visible

**File:** `src/pages/Dashboard.tsx:96-103`
**Code:**
```typescript
if (needsReferral && !hasActivePublication && !setupDismissed) {
  return <DashboardLayout title="Dashboard"><ReferralStep onComplete={...} /></DashboardLayout>;
}
```
**Problem:** A new user who closes the tab during `ReferralStep` without submitting, then returns, is gated behind this screen again. If the `publisher-profile` API call fails (returns null), `needsReferral = false` (correct fallback). But if a user never selects a referral source, they'll see this screen on every login until they do.
**Impact:** Medium. No visible escape route beyond completing the form.
**Fix:** Add a "Skip for now" link that calls `setNeedsReferral(false)` without persisting, allowing the user to access the dashboard.

---

### 🧟 ZOMBIE #4 — No authoritative `setup_complete` DB flag

**File:** `src/components/dashboard/OnboardingChecklist.tsx:54-91`
**Problem:** The `OnboardingChecklist` derives its state from **three independent API calls** on every mount:
1. `supabase.from("assets").select... .eq("user_id", user.id)` — counts assets
2. `supabase.from("rss_sources").select... .eq("sync_status", "active")` — counts active sources
3. `fetch(publisher-profile)` — checks `stripe_onboarding_complete`

If any call is slow (Supabase cold start) or returns null/error, the checklist shows steps as incomplete even for fully-onboarded publishers. There is **no single DB flag** (`publishers.setup_complete`) that can be read atomically.
**Impact:** High. A transient Supabase error causes a fully-setup publisher to see all 3 onboarding steps as incomplete on a refresh.
**Fix:** Add `setup_complete BOOLEAN DEFAULT FALSE` to the `publishers` table. Set it to `true` once all 3 conditions are met (can be updated by publisher-profile Edge Function). Read this single column in `OnboardingChecklist`.

---

### 🧟 ZOMBIE #5 — `hasActivePublication` checks only `rss_sources` with `sync_status="active"`

**File:** `src/pages/Dashboard.tsx:55-62`
**Code:**
```typescript
const { count } = await supabase
  .from("rss_sources")
  .select("id", { count: "exact", head: true })
  .eq("user_id", user.id)
  .eq("sync_status", "active");   // ← strict filter
```
**Problem:** `rss_sources` is a VIEW over `content_sources`. A publisher who registered content via the API path (`PublicationSetupFlow → api_path` tab) or whose source is in `sync_status="pending"` will have `count=0`, triggering the setup flow again despite having an existing source.
**Impact:** Medium. API-registered publishers or those with pending sources see the full setup flow on every login.
**Fix:** Remove `sync_status = "active"` filter, or also check `content_sources` directly.

---

## 4. UI Elements Per State — Full Inventory

| UI Element | NEW_USER | IN_ONBOARDING | SETUP_COMPLETE | ACTIVE_PUBLISHER |
|------------|----------|---------------|----------------|-----------------|
| `PageLoader` | Shown (auth loading) | Gone | Gone | Gone |
| `ReferralStep` | **SHOWN** (blocks dashboard) | Gone after submit | Gone | Gone |
| `PublicationSetupFlow` | **SHOWN** | **SHOWN** | Gone | Gone |
| `OnboardingChecklist` (steps) | Rendered but not shown during setup flow | Rendered (in dashboard view) | Rendered — shows success banner 🧟 | Hidden (localStorage flag) |
| `SetupBanner` | Hidden (default true state) | Hidden (same reason) 🧟 | Hidden | Hidden |
| Dashboard metrics | Hidden (setup flow shown) | Hidden | **SHOWN** | **SHOWN** |
| Action cards (Embed, Archive) | Hidden | Hidden | **SHOWN** | **SHOWN** |
| `ImportProgressBanner` | Hidden | **MAY SHOW** (if import queued) | **MAY SHOW** | **MAY SHOW** |

---

## 5. Conditional Render Audit — Dashboard "Completion Summary"

**Question:** Does the OnboardingChecklist have a conditional render based on `publisher_status` in Supabase?

**Answer: NO.** There is no `publisher_status` column in Supabase. The checklist reads three separate signals:
- `assets.count` (Supabase direct query)
- `rss_sources.count` with `sync_status="active"` (Supabase direct query)
- `profile.stripe_onboarding_complete` (Edge Function)

The checklist is **always mounted** in the main dashboard view (line `Dashboard.tsx:136`). It is never conditionally excluded based on a DB flag. The only suppression mechanism is `localStorage.getItem(DISMISS_KEY)`.

**Verdict:** This is Zombie #4. The fix requires a DB-level `setup_complete` flag.

---

## 6. Persistence Check — "If I am 100% setup and refresh, does 'Getting Started' junk reappear?"

**Test scenario:** Publisher has `assets > 0`, `rss_sources.sync_status="active"`, `stripe_onboarding_complete=true`, and has **never** clicked "Dismiss" on the "You're all set!" banner.

**Result: YES — junk reappears.**

On refresh:
1. `OnboardingChecklist` mounts → re-fetches all 3 signals → all return "done" → `allDone=true`
2. `dismissed = localStorage.getItem("opedd_onboarding_complete_dismissed") === "true"` → `false` (never clicked Dismiss)
3. Component renders the "You're all set!" `<PartyPopper>` banner (line `OnboardingChecklist.tsx:134-153`)
4. This banner persists until the publisher manually clicks "Dismiss"

**Verdict: ZOMBIE #1 confirmed.** The "You're all set!" banner is a zombie element that reappears on every dashboard refresh until explicit user dismissal. It must auto-dismiss as soon as all steps complete.
