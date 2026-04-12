# Zasqua Frontend

## What This Is

Static archival discovery site for the Zasqua platform. Built with Eleventy and Pagefind, served from Cloudflare R2. Presents 104K+ archival descriptions across 5 repositories with IIIF deep-zoom viewers, full-text search including OCR content, faceted filtering, and Miller columns tree navigation.

## Core Value

Open-access discovery interface for digitised historical archives — fast, cacheable, no runtime server dependency.

## Requirements

### Validated

- 11ty static site with Nunjucks templates, built from pre-exported JSON data — v0.1.0
- Pagefind client-side search with faceted filtering (repository, level, date, country, language) — v0.1.0
- Description page template with breadcrumb navigation, ISAD(G) metadata sections — v0.1.0
- Repository landing pages — v0.1.0
- Pre-built static JSON for Miller columns tree navigation — v0.1.0
- OCR full-text search for PE-BN collection (14,331 items) — v0.2.0
- TIFY v0.31.0 IIIF viewer with deep zoom, fullscreen, thumbnails — v0.2.0
- Reutilisation section (METS URL, IIIF manifest URL, FAIR/IIIF blurb) — v0.3.0
- Ancestor chain search filter for scoped search at any hierarchy level — v0.3.0
- Miller columns on container description pages — v0.3.0
- Site hosting on Cloudflare R2 + Worker — v0.3.1
- Parallel R2 upload script (345 files/s, ~10 min deploys) — v0.3.2

### Active

- Place detail pages (`/lugar/{name}/`) with authority links, coordinates, embedded map, linked descriptions
- Entity detail pages (`/entidad/{code}/`) with structured name, dates, function, linked descriptions
- Place explorer (`/explorar/lugares/`) with search, faceted filtering, heatmap map
- Entity explorer (`/explorar/entidades/`) with search, faceted filtering — currently crashes browsers, needs UX redesign (Phase 10)
- Pre-built description aggregates for entities and places (build-time, no runtime API)
- PMTiles on R2 for serverless maps (MapLibre GL JS)
- Fix missing nav keys in public repo ui.js (Acerca, Catalogación)
- Build pipeline OOM verification — single vs parallel Eleventy build decision (deferred from Phase 4 to Phase 6, when entity/place templates exist to profile)
- Description-to-entity/place linking on description pages (Phase 11 — deferred until entity data stabilises)

### Recently Validated

- Entity explorer (`/explorar/entidades/`) with Pagefind-powered search, entity type/function/date facets, pagination, URL state — v0.5.0 Phase 8 (needs UX redesign in Phase 10)
- Place explorer migrated from in-memory JSON filtering to Pagefind place index — v0.5.0 Phase 8 (needs UX redesign in Phase 10)
- Three separate Pagefind indices (descriptions, entities, places) built in CI — v0.5.0 Phase 8
- Pre-compute scripts for entity/place link shards, index files (D-06/D-07), and co-occurrence graph — v0.5.0 Phase 4
- Build pipeline wiring (B2 downloads, pre-compute steps, passthrough copies) — v0.5.0 Phase 4

- New visual identity — DM Sans body text, Crimson Text logotype, burgundy/periwinkle palette, warm gray neutrals — v0.4.0 Phase 1
- All hardcoded hex colours replaced with Tailwind stone-scale tokens and brand colour variables — v0.4.0 Phase 2
- Redesigned header, footer, and interactive elements to match Figma visual identity spec — v0.4.0 Phase 2
- AHRB notarial volume import (542 volumes, ~106K pages live) — v0.4.0 Phase 3
- Homepage masonry grid preserved — v0.4.0 Phase 2

### Out of Scope

- Collaborative cataloguing — separate project (zasqua-catalogacion)
- Runtime API dependency — all data pre-built at build time (API may be used as data source during build, not at page load)

## Context

- **Codebase:** Eleventy 3, Nunjucks, Tailwind CSS v4 (standalone CLI), Pagefind, TIFY, vanilla JS
- **Shipped:** v0.4.0 (2026-03-25) — visual identity + AHRB volumes, 106K pages live
- **Data:** 106K description pages, 7,068 places (2,237 with coordinates), 83,412 entities (pending further cleanup in zasqua-entities phases 10.1–10.2), 292K entity-description links, 194K place-description links
- **Infrastructure:** Cloudflare R2 (`zasqua-site` bucket), Cloudflare Worker, GitHub Actions CI/CD
- **Data source:** JSON exports from Django backend, downloaded from Backblaze B2 at build time
- **Entity data:** entities.json (31 MB, 92K records — not yet updated to 83K canonical from zasqua-entities Phase 10) — entity_code, display_name, sort_name, entity_type, given_name, surname, honorific, date_earliest, date_latest, name_variants, primary_function, dates_of_existence, history
- **Place data:** places.json (updated 2026-04-03, 7,068 places) — id, display_name, place_type, lat/lon, name_variants, whg_id, tgn_id, hgis_id, country_code. Wikidata stripped (56% wrong QIDs), country codes stripped (derived from bad Wikidata)

## Constraints

- **No runtime server** — everything is static, pre-built
- **Client-side search only** — Pagefind indexes at build time
- **Build time** — ~14 minutes for Eleventy + Pagefind at 106K pages; adding ~100K entity/place pages will significantly increase this unless build architecture is reworked
- **Build architecture (open question)** — Phase 4 wired a single Eleventy build; parallel split deferred to Phase 6 when entity/place templates exist and build times can be profiled
- **File count** — exceeds Cloudflare Pages' 100K limit, hence R2 + Worker

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static site over SPA | Cacheable, fast, no server dependency | Good — CDN-friendly, low maintenance |
| Pagefind over Meilisearch | No runtime server, works offline | Good — fast, zero-cost search |
| Miller columns over accordion | Better for deep hierarchies | Good — lazy-loaded, scales well |
| R2 + Worker over Netlify | No file count limits, faster deploys | Good — 10 min deploys vs 2+ hours |
| Parallel upload over rclone | rclone bottlenecked at 30ms/file RTT | Good — 345 files/s |
| Tailwind v4 standalone CLI over npm | No npm dependency, single binary | Good — fast compilation, no build chain complexity |

## Current Milestone: v0.5.0 Entity & Place Discovery

**Goal:** Add entity and place detail pages plus spatial and network discovery interfaces, with all data pre-built at build time.

**Target features:**
- Place detail pages (`/lugar/{name}/`) — authority links, coordinates with embedded PMTiles/MapLibre map, linked descriptions
- Entity detail pages (`/entidad/{code}/`) — structured name, dates, function, linked descriptions
- Place explorer (`/explorar/lugares/`) — search, faceted filtering, heatmap map
- Entity explorer (`/explorar/entidades/`) — search, faceted filtering, UX redesign (Phase 10)
- Place explorer (`/explorar/lugares/`) — search, faceted filtering, map, UX redesign (Phase 10)
- Description-to-entity/place linking on description pages (Phase 11)
- Pre-built description aggregates (build-time, no runtime API)
- PMTiles hosted on R2 for serverless maps
- Build architecture exploration — independent builds, incremental builds, or integrated
- Fix missing ui.js nav keys in public repo

## Tech Debt

(None identified)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-12 — Phase 10.2 complete (explorer parity: Protomaps basemap, place explorer grid layout, entity detail accordion + focal node colour fix)*
