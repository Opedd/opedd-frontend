

# Authentication Handshake Diagnosis & Solution

## Root Cause Analysis

After thorough examination of the codebase, I've identified **three critical issues** causing the 401 Unauthorized errors:

### Issue 1: AuthContext Exposes User But Not Session/Token

**Location:** `src/contexts/AuthContext.tsx`

The `AuthContext` currently stores and exposes only the `User` object, not the full session or access token:

```typescript
// Current implementation (lines 5-9)
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  // ❌ Missing: accessToken or session
}
```

**Impact:** Every component that needs to make authenticated API calls must independently call `supabase.auth.getSession()` to retrieve the access token. This creates:
- Duplicate async calls throughout the app
- Race conditions where `getSession()` may return `null` during auth state transitions
- Inconsistent token retrieval patterns

---

### Issue 2: Token Retrieval Pattern is Error-Prone

**Locations:** 
- `src/components/dashboard/RegisterContentModal.tsx` (lines 379-384)
- `src/components/dashboard/SmartLibraryTable.tsx` (lines 224-225)

Components fetch the token inline before API calls:

```typescript
// Current pattern
const { data: sessionData } = await supabase.auth.getSession();
const accessToken = sessionData?.session?.access_token;

if (!accessToken) {
  throw new Error("No access token available");
}
```

**Problems:**
1. **Stale token risk:** `getSession()` returns the cached session, which may be expired
2. **No automatic refresh:** Unlike `onAuthStateChange`, this doesn't trigger a token refresh
3. **Race condition:** If called during auth state change (login/logout), may return `null`
4. **Scattered logic:** Token retrieval is duplicated across multiple components

---

### Issue 3: API Functions Require Manual Token Passing

**Location:** `src/lib/api.ts`

All API functions require the access token as an optional parameter:

```typescript
// Lines 140-158
export const contentSourcesApi = {
  create: <T>(body: {...}, token?: string | null) =>
    apiFetch<T>(API.contentSources, { method: 'POST', body: ... }, token),
    
  sync: <T>(sourceId: string, token?: string | null) =>
    apiFetch<T>(..., token),
};
```

**Impact:** Every caller must:
1. First fetch the session/token
2. Pass it manually to each API call
3. Handle the case where token is undefined

This "opt-in" authentication pattern makes it easy to accidentally call APIs without credentials.

---

## Proposed Solution Architecture

### Solution Design: Centralized Session Management

I recommend a **session-aware architecture** that:
1. Exposes the access token from `AuthContext`
2. Automatically refreshes the token when needed
3. Creates API functions that automatically include credentials

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AuthContext                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Stores: user, session, accessToken                          │    │
│  │ Exposes: useAuth() hook with token                          │    │
│  │ Listens: onAuthStateChange for auto-refresh                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           useAuthenticatedApi()                      │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ Custom hook that wraps API calls with current token          │    │
│  │ Auto-injects Authorization header from AuthContext           │    │
│  │ Returns pre-authenticated API methods                        │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           Components                                 │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │ No manual token fetching                                     │    │
│  │ Just call: api.contentSources.create({...})                  │    │
│  │ Token automatically included                                 │    │
│  └─────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Enhance AuthContext to Expose Session and Token

Update `src/contexts/AuthContext.tsx` to store and expose the full session:

**Changes:**
- Store `Session` object alongside `User`
- Expose `accessToken` as a computed property
- Add a `getAccessToken()` helper that refreshes if expired

```typescript
// New interface
interface AuthContextType {
  user: User | null;
  session: Session | null;
  accessToken: string | null;   // Convenient accessor
  isLoading: boolean;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;  // Async refresh if needed
}
```

### Step 2: Create useAuthenticatedApi Hook

Create a new hook `src/hooks/useAuthenticatedApi.ts` that:
- Consumes `AuthContext` for the current token
- Returns API methods pre-bound with the token
- Handles token refresh automatically

```typescript
// Usage in components:
const { contentSources, licenses } = useAuthenticatedApi();

// No manual token passing needed
await contentSources.create({ feed_url, name });
await contentSources.sync(sourceId);
```

### Step 3: Update API Wrapper for Token Auto-Injection

Modify `src/lib/api.ts` to:
- Export a factory function that creates authenticated API instances
- Keep existing functions for backward compatibility
- Add token refresh logic before each request

### Step 4: Refactor Components to Use New Pattern

Update these files to remove manual `getSession()` calls:

| File | Current Pattern | New Pattern |
|------|-----------------|-------------|
| `RegisterContentModal.tsx` | `getSession()` + manual token | `useAuthenticatedApi()` |
| `SmartLibraryTable.tsx` | `getSession()` + manual token | `useAuthenticatedApi()` |
| Any future API callers | Manual token fetching | Hook-based auto-injection |

---

## Technical Details

### AuthContext Enhancement

```typescript
// src/contexts/AuthContext.tsx
import { Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  accessToken: string | null;
  isLoading: boolean;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

// In useEffect:
supabase.auth.getSession().then(({ data: { session } }) => {
  setSession(session);
  setUser(session?.user ?? null);
});

supabase.auth.onAuthStateChange((_event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
});

// Expose computed accessToken
const accessToken = session?.access_token ?? null;

// Async getter with refresh
const getAccessToken = async () => {
  const { data: { session: freshSession } } = await supabase.auth.getSession();
  if (freshSession) {
    setSession(freshSession);
    return freshSession.access_token;
  }
  return null;
};
```

### useAuthenticatedApi Hook

```typescript
// src/hooks/useAuthenticatedApi.ts
import { useAuth } from "@/contexts/AuthContext";
import { contentSourcesApi, licensesApi } from "@/lib/api";

export function useAuthenticatedApi() {
  const { getAccessToken } = useAuth();

  return {
    contentSources: {
      create: async (body) => {
        const token = await getAccessToken();
        return contentSourcesApi.create(body, token);
      },
      sync: async (sourceId) => {
        const token = await getAccessToken();
        return contentSourcesApi.sync(sourceId, token);
      },
      verify: async (sourceId) => {
        const token = await getAccessToken();
        return contentSourcesApi.verify(sourceId, token);
      },
      // ... other methods
    },
    licenses: {
      // ... authenticated license methods
    }
  };
}
```

### Edge Cases Handled

1. **Page refresh:** `getSession()` on mount restores session from localStorage
2. **Token expiry:** `onAuthStateChange` fires on auto-refresh
3. **Logout:** Session becomes null, API calls will fail gracefully
4. **Race conditions:** `getAccessToken()` always fetches fresh token before API calls

---

## Files to Create/Modify

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/contexts/AuthContext.tsx` | Expose session and token |
| Create | `src/hooks/useAuthenticatedApi.ts` | Centralized auth API wrapper |
| Modify | `src/components/dashboard/RegisterContentModal.tsx` | Use new hook |
| Modify | `src/components/dashboard/SmartLibraryTable.tsx` | Use new hook |

---

## Benefits of This Approach

1. **Single source of truth:** Token managed in one place
2. **Automatic refresh:** Token always current before API calls
3. **Clean component code:** No repeated `getSession()` boilerplate
4. **Type safety:** Hook returns properly typed API methods
5. **Easy debugging:** Can log all authenticated requests from one location
6. **Backward compatible:** Existing API functions still work for edge cases

