

## Problem Diagnosis

The sync completes successfully on the external licensing backend, but the articles never appear in the dashboard. Here is why:

1. **No local record created**: When you register a publication, the code only sends the data to the external V1 API. It never inserts a corresponding record into the local `rss_sources` table, so the Sources tab stays empty.

2. **Asset fetch fails silently**: The Dashboard tries to load articles from the external API (`/content-sources/me/assets`), but this endpoint returns 401/404 errors (JWT mismatch between Lovable Cloud and the external backend). The error is swallowed silently, so no articles appear.

3. **Two disconnected data stores**: Single works are saved directly to the local `assets` table (and show up fine), but publication syncs only exist on the external API with no local copy.

## Solution

After a successful publication sync via the external API, **also insert a local record** into both `rss_sources` and `assets` tables. This ensures the Sources tab and Library tab display the data regardless of whether the external API is reachable.

### Step 1: Insert local `rss_sources` record after API creation

In `RegisterContentModal.tsx`, after the external API `contentSources.create` call succeeds, insert a matching row into the local `rss_sources` table with the source name, feed URL, platform, and sync status.

### Step 2: Sync articles into local `assets` table

After the external `contentSources.sync` call, attempt to fetch the synced articles from the external API. If the external API is unreachable (401/404), create a placeholder asset linked to the source so the user can see something was registered. Update the local `rss_sources.article_count` accordingly.

### Step 3: Update Dashboard asset fetching to use local data as primary source

Modify `fetchAssets` in `Dashboard.tsx` to query the local `assets` table directly (via Supabase) as the primary data source, with the external API as an optional enrichment layer. This eliminates the dependency on the external API for displaying registered content.

### Step 4: Link assets to sources

When inserting assets locally after a sync, set the `publication_id` field to the local `rss_sources.id` so that the Library tab's source filter works correctly. Map the `source_id` on the UI asset type to this local ID.

### Technical Details

**RegisterContentModal.tsx changes:**
- After `contentSources.create` succeeds, run `supabase.from("rss_sources").insert(...)` with name, feed_url, platform, user_id, sync_status: "active"
- After `contentSources.sync` succeeds, attempt to fetch articles from the API and insert them into the local `assets` table
- If the API fetch fails, still mark the source as active with article_count from the sync response

**Dashboard.tsx changes:**
- Replace `contentSources.listAssets` call with a direct Supabase query: `supabase.from("assets").select("*").eq("user_id", user.id)`
- Remove the external API dependency for the primary asset list
- Keep the external API call as an optional secondary enrichment (non-blocking)

**SourcesView.tsx changes:**
- No structural changes needed -- it already reads from local `rss_sources`, which will now have data

This approach makes the local database the source of truth for the UI, while the external API handles the licensing/verification backend logic.

