# Zasqua Frontend

## What This Is

Static archival discovery site for the Zasqua platform. Built with Eleventy and Pagefind, served from Cloudflare R2. Presents 192K+ pages (106K descriptions, 78K entities, 7K places) across 5 repositories with IIIF deep-zoom viewers, full-text search including OCR content, faceted filtering, entity/place explorers, and Miller columns tree navigation.

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

- Hugo migration — replace Eleventy with Hugo for sustainable builds at 192K+ pages
- Pagefind optimisation — assess and fix 3-index scanning scalability post-Hugo
- R2 diff-based upload — only PUT changed files instead of full sync
- CI pipeline rewrite — GitHub Actions workflow for Hugo build chain

### Validated

- Place detail pages (`/{place_code}/`, e.g. `/nl-xxxxxx/`) with authority links, coordinates, embedded map, linked descriptions — v0.5.0
- Entity detail pages (`/{entity_code}/`, e.g. `/ne-xxxxxx/`) with structured name, dates, function, linked descriptions — v0.5.0
- Place explorer (`/lugares/`) with search, faceted filtering, clustered marker map — v0.5.0
- Entity explorer (`/entidades/`) with infinite bipartite graph, search, faceted filtering — v0.5.0
- Description-to-entity/place linking on description pages — v0.5.0
- Pre-built description aggregates for entities and places (build-time, no runtime API) — v0.5.0
- PMTiles on R2 for serverless maps (MapLibre GL JS) — v0.5.0
- Entity explorer with Pagefind-powered search, entity type/function/date facets, pagination, URL state — v0.5.0
- Place explorer migrated from in-memory JSON filtering to Pagefind place index — v0.5.0
- Three separate Pagefind indices (descriptions, entities, places) built in CI — v0.5.0
- Pre-compute scripts for entity/place link shards, index files, and co-occurrence graph — v0.5.0
- Build pipeline wiring (B2 downloads, pre-compute steps, passthrough copies) — v0.5.0
- New visual identity — DM Sans body text, Crimson Text logotype, burgundy/periwinkle palette, warm gray neutrals — v0.4.0
- All hardcoded hex colours replaced with Tailwind stone-scale tokens and brand colour variables — v0.4.0
- Redesigned header, footer, and interactive elements to match Figma visual identity spec — v0.4.0
- AHRB notarial volume import (542 volumes, ~106K pages live) — v0.4.0
- Homepage masonry grid preserved — v0.4.0

### Out of Scope

- Collaborative cataloguing — separate project (zasqua-catalogacion)
- Runtime API dependency — all data pre-built at build time (API may be used as data source during build, not at page load)

## Context

- **Codebase:** Eleventy 3, Nunjucks, Tailwind CSS v4 (standalone CLI), Pagefind, TIFY, vanilla JS — migrating to Hugo in v1.0.0
- **Shipped:** v0.5.1 (2026-04-16) — entity/place discovery, explorers, description linking. Deploy to zasqua.org blocked by CI OOM
- **Data:** 106K description pages, 7,068 places (2,237 with coordinates), 83,412 entities (pending further cleanup in zasqua-entities phases 10.1–10.2), 292K entity-description links, 194K place-description links
- **Infrastructure:** Cloudflare R2 (`zasqua-site` bucket), Cloudflare Worker, GitHub Actions CI/CD
- **Data source:** JSON exports from Django backend, downloaded from Backblaze B2 at build time
- **Entity data:** entities.json (31 MB, 92K records — not yet updated to 83K canonical from zasqua-entities Phase 10) — entity_code, display_name, sort_name, entity_type, given_name, surname, honorific, date_earliest, date_latest, name_variants, primary_function, dates_of_existence, history
- **Place data:** places.json (updated 2026-04-03, 7,068 places) — id, display_name, place_type, lat/lon, name_variants, whg_id, tgn_id, hgis_id, country_code. Wikidata stripped (56% wrong QIDs), country codes stripped (derived from bad Wikidata)

## Constraints

- **No runtime server** — everything is static, pre-built
- **Client-side search only** — Pagefind indexes at build time
- **Build time** — Eleventy OOMs at 192K pages with 7 GB heap on GitHub Actions (exit code 134). Hugo migration planned for v1.0.0
- **Build architecture** — Hugo replaces Eleventy; data enrichment moves to pre-build Node.js scripts, content stubs generated for Hugo
- **File count** — exceeds Cloudflare Pages' 100K limit, hence R2 + Worker

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static site over SPA | Cacheable, fast, no server dependency | Good — CDN-friendly, low maintenance |
| Pagefind over Meilisearch | No runtime server, works offline | Good — fast, zero-cost search |
| Miller columns over accordion | Better for deep hierarchies | Good — lazy-loaded, scales well |
| R2 + Worker over Netlify | No file count limits, faster deploys | Good — 10 min deploys vs 2+ hours |
| Parallel upload over rclone | rclone bottlenecked at 30ms/file RTT | Good — 345 files/s |
| Tailwind v4 standalone CLI over npm | No npm dependency, single binary | Revisit — Hugo PATH security patch (v0.146.0) requires npm; switching to `@tailwindcss/cli` via npm in v1.0.0 |
| Eleventy → Hugo migration | Eleventy OOMs at 192K pages; Hugo handles 500K in <1 GB | Pending — v1.0.0 |

## Current Milestone: v1.0.0 Build Pipeline Sustainability

**Goal:** Migrate the frontend build from Eleventy to Hugo so the site builds reliably at 192K+ pages without hitting memory or time limits, and remains sustainable as the catalogue grows towards 500K pages.

**Target features:**
- Hugo migration — pre-build data enrichment script, content file generation, Go template rewrites for all page templates
- Pagefind optimisation — assess whether 3-index scanning remains viable post-Hugo; if not, implement incremental indexing or JSON-based index generation
- R2 diff-based upload — only PUT changed files instead of full sync
- CI pipeline update — GitHub Actions workflow rewritten for the Hugo build chain

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
*Last updated: 2026-04-16 — Milestone v1.0.0 started (Build Pipeline Sustainability)*
