# Opedd Edge Case Log — Half-State & Assumed-Success Failures

> Backend-to-frontend wiring audit. Every entry is a place where the UI assumes success
> without an adequate fallback, or where a partial operation leaves an unrecoverable DB state.

---

## Half-State Failure #1 — LicenseSuccess resend always shows "Email resent" regardless of outcome

**Severity:** High
**File:** `src/pages/LicenseSuccess.tsx` — `handleResend` function

**Code:**
```typescript
const handleResend = async () => {
  if (!data?.buyer_email || resending) return;
  setResending(true);
  try {
    await fetch(`${EXT_SUPABASE_URL}/resend-licenses`, {
      method: "POST",
      headers: { apikey: EXT_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.buyer_email }),
    });
    setResent(true);   // ← ALWAYS fires, regardless of response status
```

**Problem:** The response is not checked. If `resend-licenses` returns 429 (rate limited), 500, or any non-2xx, `setResent(true)` still fires and the UI shows "Email resent ✓". The buyer believes the email was sent when it was not.

**Scenario:** Buyer clicks "Resend" twice quickly → first call succeeds, second call returns 429 rate limit → UI shows success on both. Buyer never gets the second email and has no indication something failed.

**Fix Required:**
```typescript
const res = await fetch(`${EXT_SUPABASE_URL}/resend-licenses`, { ... });
const result = await res.json();
if (res.ok && result.success !== false) {
  setResent(true);
} else {
  toast({ title: "Resend failed", description: "Please try again in a few minutes.", variant: "destructive" });
}
```

---

## Half-State Failure #2 — Stripe Connect creates a Stripe account before DB write; network failure = orphaned account

**Severity:** High
**File:** Backend `publisher-profile` Edge Function → `connect_stripe` action

**Flow:**
1. `connect_stripe` calls `stripe.accounts.create({ type: "express" })` → Stripe creates account
2. Then calls `supabase.from("publishers").update({ stripe_account_id })` → DB write
3. Then calls `stripe.accountLinks.create(...)` → generates onboarding URL

**Half-state:** If step 2 fails (DB timeout/conflict), the Stripe account exists in Stripe but `stripe_account_id` is **not** saved in Supabase. The user's next "Connect Stripe" click creates a **second orphaned Stripe Express account**. Over time, a single publisher accumulates multiple unlinked Stripe accounts with no way to recover.

**Observable symptom:** Publisher connects Stripe multiple times due to UI errors. Stripe dashboard shows multiple Express accounts for Opedd but none are linked to the publisher's Supabase record.

**Fix Required:** Wrap in a transaction or check-then-update pattern:
1. Before creating a new Stripe account, query `publishers.stripe_account_id` — if non-null, create a new account link for the existing account instead of creating a new one.
2. The `connect_stripe` action should already do this — verify the implementation handles `existing stripe_account_id !== null` correctly and only creates a **new account link**, not a new account.

---

## Half-State Failure #3 — Import sitemap shows "0 articles imported" as a success state

**Severity:** Medium
**File:** `src/pages/Onboarding.tsx:103-111`

**Code:**
```typescript
const result = await res.json();
if (!res.ok || !result.success) throw new Error(result.error || "Import failed");
setImportResult({ inserted: result.data.new_articles_inserted });
// → setStep("verify") or setStep("prices")
```

**Problem:** `import-sitemap` is **async** — it stores URLs in `import_queue.pending_urls` and returns immediately with `new_articles_inserted: 0`. Processing happens via `pg_cron` every 2 minutes.

**UI shows:** "0 articles imported successfully" with a green checkmark.

The user enters the pricing step believing nothing was imported. They don't know that `ImportProgressBanner` will later show the real count. The onboarding flow has no awareness of the async queue.

**Observable symptom:** New publisher completes onboarding believing they have 0 articles. They might re-import, creating duplicates in the queue.

**Fix Required:** Replace the success message: instead of "0 articles imported", show "Import queued — your articles will appear in your library within 2 minutes." Check `result.data.queued` vs `result.data.new_articles_inserted` to branch the message.

---

## Half-State Failure #4 — Blockchain `pending` status invisible to publisher; silent failures

**Severity:** Medium
**Files:** Backend `stripe-webhook`, `issue-license` Edge Functions; no frontend surface exists

**Flow:** When a license is issued:
1. License key created → `license_transactions.blockchain_status = "pending"`
2. `registerOnChain()` fires async (fire-and-forget)
3. `blockchain_status` transitions: `pending → submitted → confirmed | failed`

**Problem:** There is no frontend surface that shows `blockchain_status`. The publisher's Ledger page (`src/pages/Ledger.tsx`) shows transactions but does not display `blockchain_status`. If `registerOnChain()` fails (`status = "failed"`), the license is issued and paid but the on-chain proof does not exist. The publisher and buyer have no indication the blockchain record is missing.

**Observable symptom:** Buyer calls `verify-license` endpoint → `verifyOnChain()` returns false → license appears invalid on-chain even though it's valid in DB. Publisher cannot explain why the verification fails.

**Fix Required:**
1. Add `blockchain_status` column to the Ledger page transaction rows (show `pending/confirmed/failed` badge)
2. If `failed`, show a "Retry on-chain registration" button that calls a new `retry_blockchain` action in `publisher-profile`

---

## Half-State Failure #5 — `PublicationSetupFlow` completion state is not re-fetched from DB; session-only

**Severity:** Medium
**File:** `src/pages/Dashboard.tsx:109-117`

**Code:**
```typescript
onComplete: (completionState) => {
  setSetupDismissed(true);
  setHasActivePublication(true);
  if (completionState) {
    setSetupCompletion({
      pricingDone: completionState.pricingDone,
      widgetDone: completionState.widgetDone,
    });
  }
```

**Problem:** `completionState` is passed from within the `PublicationSetupFlow` component based on **local UI state during that session**. If a user closes the browser mid-setup (after content import but before setting prices), the `completionState` is lost. On refresh:
- `setupCompletion` defaults to `{ pricingDone: true, widgetDone: true }` (Dashboard.tsx:40)
- `SetupBanner` shows as if pricing and widget are done
- The publisher never sees the "Set your rates" nudge again

**Observable symptom:** Publisher imports content, closes browser, returns next day. Dashboard looks complete. They never set prices. Articles are listed at $0 with no licensing enabled.

**Fix Required:** On Dashboard mount, fetch `publisher-profile` to get `default_human_price` and `default_ai_price`. If both are `null` or `0`, set `pricingDone: false`. This ensures `SetupBanner` accurately reflects DB state on every load.

---

## Assumed-Success Failure #6 — `IssueArchiveLicenseModal` success with no DB verification

**Severity:** Low
**File:** `src/components/dashboard/IssueArchiveLicenseModal.tsx` (not read — inferred from Dashboard.tsx:235)

**Pattern:** The modal calls `issue-license` and on `result.success`, closes the modal and shows a toast. If the Edge Function returns `{ success: true }` but the DB write failed internally (e.g., `license_transactions` insert rolled back), the UI shows success with a license key that doesn't exist in DB.

**Observable symptom:** Publisher issues an archive license, sends the key to a buyer. Buyer tries to verify → key not found in DB.

**Fix Required:** After receiving `success`, optionally poll `verify-license` with the returned key to confirm it exists in DB before showing the final success state.

---

## Assumed-Success Failure #7 — `OnboardingChecklist` stripe check reads stale API data

**Severity:** Medium
**File:** `src/components/dashboard/OnboardingChecklist.tsx:80`

**Code:**
```typescript
const stripeConnected = profileData?.stripe_onboarding_complete === true;
```

**Problem:** If Stripe Connect webhook (`account.updated`) fires and updates `stripe_onboarding_complete=true` in DB, but the user is already on the dashboard with a cached `profileData` (fetched 2 minutes ago), the Stripe step still shows as incomplete. The checklist has **no polling** — it fetches once on mount and never re-checks.

**Observable symptom:** Publisher completes Stripe onboarding in a new tab, returns to dashboard tab → checklist still shows Stripe as incomplete. They think something failed. They click "Connect Stripe" again (which is safe, generates a new account link, but confusing).

**Fix Required:** After returning from Stripe (check `?stripe=complete` in URL on the settings/payments page, then invalidate the checklist cache), or add a refresh button to the checklist, or poll the checklist every 30 seconds.

---

## Summary Table

| # | Severity | UI assumes success? | Leaves half-state in DB? | Fix complexity |
|---|----------|---------------------|--------------------------|----------------|
| 1 | High | ✅ Always shows resent success | No | Low — check res.ok |
| 2 | High | No | ✅ Orphaned Stripe account | Medium — check existing stripe_account_id |
| 3 | Medium | ✅ Shows "0 imported" | No (queue is correct) | Low — change message |
| 4 | Medium | No (silent failure) | ✅ blockchain_status=failed invisible | Medium — add Ledger column |
| 5 | Medium | ✅ Banner says "done" | No (DB is incomplete) | Medium — fetch on mount |
| 6 | Low | ✅ Modal closes on API success | Possible | Low — add verify step |
| 7 | Medium | ✅ Checklist shows stale state | No | Low — check URL param |
