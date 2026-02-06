

# Registry Architecture: Sources + Library Formalization

## Overview

Formalize the Source-to-Library relationship in the Registry by enhancing the existing Sources/Library sub-tabs with proper data linking, adding a "Source" column to the Library table, and cleaning up the registration modal flow.

## What Changes

### 1. Sources View Enhancement (SourcesView.tsx)
- Add **"Total Assets"** count to each source card (from `article_count` column in `rss_sources`)
- Add **"Last Synced"** timestamp display (already partially there, improve formatting to relative time like "2 hours ago")
- Add an **"Add Source"** button at the top of the sources grid for quick access
- Show a summary bar: "3 Sources | 142 Total Articles"

### 2. Library Table: Add "Source" Column (SmartLibraryTable.tsx)
- Add a new **"Source"** column between Title and Format columns
- For assets with a `source_id`, display the source name (will need to pass source data or resolve from the `rss_sources` table)
- For single works (no `source_id`), display a muted "Direct Upload" label
- This lets Media Orgs filter/identify which pipe an article came from

### 3. Dashboard Data Flow (Dashboard.tsx)
- Fetch sources alongside assets so source names can be resolved in the Library table
- Pass sources data to `SmartLibraryTable` as a lookup map (`Record<string, string>` of sourceId to sourceName)
- Add a source-based filter option in the Library filter dropdown (filter by specific source)

### 4. Registration Modal Refinement (RegisterContentModal.tsx)
- The existing "choice" screen already branches into Newsletter vs Media Org -- keep this as-is
- Ensure the **Newsletter path** remains a simple URL input (already done)
- Ensure the **Media Org path** supports multiple feeds with tags (already done)
- Minor UX: rename the choice labels to match the spec: "Single Feed (Newsletter)" and "Bulk/Enterprise (Media Org)"

### 5. Asset Type: Add Source Name (asset.ts)
- Add optional `source_name?: string` field to the `Asset` interface for UI display

## Technical Details

### Data Resolution Strategy
The Library table needs source names. Two approaches exist -- we will use the simpler one:

**Approach: Local Supabase Join**
- When fetching assets in `Dashboard.tsx`, also query `rss_sources` for the current user
- Build a `Map<sourceId, sourceName>` and pass it to `SmartLibraryTable`
- The `source_id` field on assets maps to `publication_id` in the DB, which references `rss_sources.id`

### Files Modified
| File | Change |
|------|--------|
| `src/types/asset.ts` | Add `source_name` field to `Asset` interface |
| `src/pages/Dashboard.tsx` | Fetch sources, build lookup map, pass to table, add source filter |
| `src/components/dashboard/SmartLibraryTable.tsx` | Add "Source" column with source name display |
| `src/components/dashboard/SourcesView.tsx` | Enhanced card layout with total assets count, improved timestamp, summary bar |
| `src/components/dashboard/RegisterContentModal.tsx` | Minor label updates on the choice screen |

### No CSS/Layout Breaking Changes
All changes follow the "Logic Swap Only" constraint -- we are adding data columns and enhancing existing cards while keeping the current design language (colors, fonts, card styles) intact.

