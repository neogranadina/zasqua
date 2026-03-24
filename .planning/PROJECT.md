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

- New visual identity — DM Sans body text, Crimson Text logotype, burgundy/periwinkle palette, warm gray neutrals
- Redesigned header, footer, and interactive elements to match Figma visual identity spec
- AHRB notarial volume import — export backend data, rebuild frontend with ~2K new AHRB descriptions
- Homepage masonry grid preserved (consistent with Neogranadina's design)

### Out of Scope

- Collaborative cataloguing — separate project (zasqua-catalogacion)
- Entity/place detail pages — ships with a future release when zasqua-entities is ready

## Context

- **Codebase:** Eleventy 3, Nunjucks, Pagefind, TIFY, vanilla JS/CSS
- **Shipped:** v0.3.2 (2026-03-10) — R2 hosting migration + parallel deploy pipeline
- **Data:** 104K+ description pages, 1,602 tree JSON files, ~211K total files / 2.3 GB built site
- **Infrastructure:** Cloudflare R2 (`zasqua-site` bucket), Cloudflare Worker, GitHub Actions CI/CD
- **Data source:** JSON exports from Django backend, downloaded from Backblaze B2 at build time

## Constraints

- **No runtime server** — everything is static, pre-built
- **Client-side search only** — Pagefind indexes at build time
- **Build time** — ~14 minutes for Eleventy + Pagefind at 104K pages
- **File count** — exceeds Cloudflare Pages' 100K limit, hence R2 + Worker

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Static site over SPA | Cacheable, fast, no server dependency | Good — CDN-friendly, low maintenance |
| Pagefind over Meilisearch | No runtime server, works offline | Good — fast, zero-cost search |
| Miller columns over accordion | Better for deep hierarchies | Good — lazy-loaded, scales well |
| R2 + Worker over Netlify | No file count limits, faster deploys | Good — 10 min deploys vs 2+ hours |
| Parallel upload over rclone | rclone bottlenecked at 30ms/file RTT | Good — 345 files/s |

## Current Milestone: v0.4.0 Visual Identity & AHRB Volumes

**Goal:** Unify the frontend under Zasqua's new visual identity and publish 542 AHRB notarial volumes on zasqua.org.

**Target features:**
- New visual identity across all page types (home, search, repository, description)
- AHRB notarial volume import — backend export to B2, frontend rebuild, deploy

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
*Last updated: 2026-03-24 — milestone v0.4.0 started*
