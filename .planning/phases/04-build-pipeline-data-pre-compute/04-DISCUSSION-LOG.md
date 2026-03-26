# Phase 4: Build Pipeline & Data Pre-compute - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-26
**Phase:** 04-build-pipeline-data-pre-compute
**Areas discussed:** Pagefind strategy

---

## Pagefind Strategy

### Q1: Should entity/place pages be included in Pagefind's site-wide search index?

| Option | Description | Selected |
|--------|-------------|----------|
| Exclude from Pagefind | Entity/place pages get data-pagefind-ignore. Site-wide search stays fast (106K descriptions only). Explorer pages use their own in-memory JSON filtering. Clean separation: /buscar/ searches descriptions, /explorar/ searches entities/places. | ✓ |
| Selective Pagefind indexing | Entity/place pages indexed for metadata only (name, type, code) — long text fields ignored. Appears in site-wide search. Moderate index growth. | |
| Full Pagefind indexing | Everything indexed. Largest index size. Risk of latency degradation at 206K pages. | |

**User's choice:** Exclude from Pagefind
**Notes:** None

### Q2: How should the explorer search data be delivered?

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-built JSON metadata files | Build-time scripts produce lightweight JSON index files with search/filter fields. Loaded once on explorer page init, filtered in-memory. places-index.json ~300 KB; entity-index.json ~5-8 MB. | ✓ |
| Pagefind JS API on separate index | Run Pagefind separately on entity/place pages. More complex pipeline but leverages Pagefind fuzzy search. | |
| You decide | Claude's discretion. | |

**User's choice:** Pre-built JSON metadata files
**Notes:** None

### Q3: Single file or sharded entity index?

| Option | Description | Selected |
|--------|-------------|----------|
| Single file | One entity-index.json loaded on explorer init. ~5-8 MB uncompressed, ~1-2 MB gzipped. Simple code, single fetch. Cloudflare edge caches. | ✓ |
| Alphabetical shards | Split into A.json, B.json, etc. Faster initial load but can't do cross-shard facet counts without loading all shards. | |
| You decide | Claude's discretion based on actual file sizes. | |

**User's choice:** Single file
**Notes:** None

### Q4: Entity index fields

| Option | Description | Selected |
|--------|-------------|----------|
| Core identity | entity_code, display_name, sort_name, entity_type | ✓ |
| Date range | date_earliest, date_latest | ✓ |
| Primary function | primary_function | ✓ |
| Description count | linked_description_count | ✓ |

**User's choice:** All four
**Notes:** User specifically mentioned wanting date ranges and function labels

### Q5: Place index fields

| Option | Description | Selected |
|--------|-------------|----------|
| Core identity | place_code, display_name, place_type | ✓ |
| Coordinates | lat, lon — needed for heatmap map | ✓ |
| Authority link flags | has_wikidata, has_whg, has_hgis booleans | ✓ |
| Description count | linked_description_count | ✓ |

**User's choice:** All four
**Notes:** None

### Q6: How should the explorer surface linked descriptions?

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch shard on select | Index stays lightweight. On click/expand, fetch per-entity/place JSON shard on demand. Same shards the detail pages use. | ✓ |
| Link to detail page | Explorer shows metadata and count only. Click navigates to detail page. | |
| Embed in index | Include description references directly in index files. Simplest code but 30-50 MB. | |

**User's choice:** Fetch shard on select
**Notes:** User wanted to be able to see all documents associated with a given entity/place from the explorer

## Claude's Discretion

- Index file script organisation (same script or separate)
- Directory structure for index files
- DEV_MODE handling for entity/place builds

## Deferred Ideas

None
