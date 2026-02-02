
# Fix: API Field Name Mismatch for Content Source Creation

## Problem Identified

The publication sync is failing with a **400 Validation Error** because the frontend payload doesn't match the backend API schema.

**Error Details:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      { "field": "url", "message": "expected string, received undefined" },
      { "field": "platform", "message": "Invalid option" }
    ]
  }
}
```

| Frontend Sends | Backend Expects | Status |
|----------------|-----------------|--------|
| `feed_url` | `url` | Mismatch |
| *(missing)* | `platform` | Missing |
| `name` | `name` | OK |

---

## Implementation

### File 1: `src/lib/api.ts` (Line 149-151)

Update the type signature for `contentSourcesApi.create`:

**Before:**
```typescript
create: <T>(body: { feed_url: string; name: string; human_price?: number; ai_price?: number }, token?: string | null)
```

**After:**
```typescript
create: <T>(body: { 
  url: string; 
  name: string; 
  platform: "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
  human_price?: number; 
  ai_price?: number 
}, token?: string | null)
```

---

### File 2: `src/hooks/useAuthenticatedApi.ts` (Lines 25-33)

Update the hook's create method to match the new type:

**Before:**
```typescript
create: useCallback(async <T>(body: { 
  feed_url: string; 
  name: string; 
  human_price?: number; 
  ai_price?: number 
})
```

**After:**
```typescript
create: useCallback(async <T>(body: { 
  url: string; 
  name: string; 
  platform: "substack" | "beehiiv" | "ghost" | "wordpress" | "other";
  human_price?: number; 
  ai_price?: number 
})
```

---

### File 3: `src/components/dashboard/RegisterContentModal.tsx` (Lines 380-386)

Update the API call to use correct field names and include platform:

**Before:**
```typescript
const sourceData = await contentSources.create<{ id: string; verification_token?: string }>({
  feed_url: feedUrl,
  name: cleanPubName,
  human_price: parseFloat(pubHumanPrice) || 4.99,
  ai_price: pubAiPrice ? parseFloat(pubAiPrice) : undefined,
});
```

**After:**
```typescript
// Determine platform type from detected platform
const platformType = (platform?.name.toLowerCase() || "other") as "substack" | "beehiiv" | "ghost" | "wordpress" | "other";

const sourceData = await contentSources.create<{ id: string; verification_token?: string }>({
  url: feedUrl,
  name: cleanPubName,
  platform: platformType,
  human_price: parseFloat(pubHumanPrice) || 4.99,
  ai_price: pubAiPrice ? parseFloat(pubAiPrice) : undefined,
});
```

The `platform` variable is already available at line 366 via `detectPlatform(feedUrl)`.

---

## Summary

| File | Change |
|------|--------|
| `src/lib/api.ts` | Rename `feed_url` to `url`, add `platform` field |
| `src/hooks/useAuthenticatedApi.ts` | Match updated type signature |
| `src/components/dashboard/RegisterContentModal.tsx` | Send `url` + `platform` in API call |

This will resolve the 400 Validation Error and allow publication syncing to complete successfully.
