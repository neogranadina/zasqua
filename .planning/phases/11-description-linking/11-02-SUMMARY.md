---
phase: 11-description-linking
plan: "02"
subsystem: frontend-template
tags: [description-page, entity-links, place-links, nunjucks, description-linking]
dependency_graph:
  requires:
    - src/_data/descriptions.js (_entity_links, _place_links, _entity_codes, _place_codes from Plan 01)
    - data/desc-entity-lookup.json (enriched, from Plan 01)
    - data/desc-place-lookup.json (enriched, from Plan 01)
    - src/_data/ui.js (ui.description.entitiesHeader, ui.description.placesHeader, ui.roles)
  provides:
    - src/description.njk (entity and place linked sections)
  affects:
    - All description pages at /{reference_code}/
tech_stack:
  added: []
  patterns:
    - Nunjucks for loop over enriched object arrays for linked sections
    - .detail-field a implicit CSS rule for link styling (no explicit class needed)
    - safeSlug filter on place display_name for URL-safe hrefs
key_files:
  created: []
  modified:
    - src/description.njk
decisions:
  - "No explicit link class on entity/place anchors — .detail-field a in input.css handles stone-900 resting + burgundy-light hover (per D-02 and UI-SPEC)"
  - "Section visibility gated on _entity_links.length > 0 / _place_links.length > 0 rather than fallback to creator_display/place_display plain text (per D-03)"
  - "Role labels rendered as &mdash; <em class='text-stone-400'> following the entity link, comma-separated via join filter (per D-06)"
metrics:
  duration_minutes: 20
  completed_date: "2026-04-12"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 1
---

# Phase 11 Plan 02: Description Linking — Template Update

Surgical template update replacing plain-text entity/place sections with clickable hyperlinks to entity and place detail pages, using the enriched data produced by Plan 01.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace entities and places sections in description.njk with linked versions | 9c4242e | src/description.njk |

## Task 2: Pending Human Verification

**Task 2** is a `checkpoint:human-verify` gate — it requires visual and functional verification of the rendered description pages. Per the execution instructions, this plan completes with Task 1 done and Task 2 pending human approval.

The verifier should:

1. Run `npm run build` or `npx eleventy --input=src --output=_site`
2. Open a description page that has linked entities (e.g. an item-level record from CIHJML-ACC)
3. Verify entity names appear as clickable links with correct hover states (stone-900 resting, burgundy-light hover)
4. Verify role labels appear in italic muted text after the entity name
5. Click an entity link — verify it navigates to the correct entity detail page at /entidad/{code}/
6. Verify place names appear as clickable links under "Lugares"
7. Click a place link — verify it navigates to the correct place detail page at /lugar/{name}/
8. Open a description with no linked entities — verify the "Personas y entidades" section is absent
9. Apply an entity or place filter in Pagefind search — verify filter counts appear
10. Verify the Spanish role labels look correct (Remitente, Testigo, Demandado, etc.)

## What Was Built

**src/description.njk** — The "Personas y entidades" and "Lugares" sections replaced:

**Before (plain text):**
- `{% if desc.creator_display %}` — single creator_display text string
- `{% if desc.place_display %}` — single place_display text string

**After (linked):**
- `{% if desc._entity_links.length > 0 %}` — loops over enriched entity objects, renders `<a href="/entidad/{code}/">` with `&mdash; <em class="text-stone-400">{role_labels}</em>` after each
- `{% if desc._place_links.length > 0 %}` — loops over enriched place objects, renders `<a href="/lugar/{display_name | safeSlug}/">` with no role label

Pagefind filter spans at lines 35-38 (`_entity_codes`, `_place_codes`) are preserved unchanged — they were already present and continue to function.

## Verification

```
Eleventy build: 310 pages, no template errors, exit 0
Acceptance criteria: all positive checks pass (for loops, hrefs, role label em, join filter)
Negative checks: creator_display — 0 occurrences, place_display — 0 occurrences
No class="text-burgundy on entity/place anchors: confirmed
```

## Deviations from Plan

**[Rule 3 — Blocking issue] Worktree working tree out of sync with target base commit**

- **Found during:** Task 1 setup
- **Issue:** The worktree was checked out at commit `d63065c` (phase 5 state). The `git reset --soft e8ebf998` moved HEAD but left the working tree at the old state, so `src/description.njk` and `src/_data/descriptions.js` did not reflect Plan 01's changes.
- **Fix:** Ran `git checkout e8ebf998 -- src/description.njk src/_data/descriptions.js src/_data/ui.js scripts/precompute-links.js` to restore key files to the correct base state before applying the Plan 02 changes.
- **Files modified:** src/description.njk (restored then modified), src/_data/descriptions.js (restored, no further changes needed), src/_data/ui.js (restored), scripts/precompute-links.js (restored)
- **No separate commit:** File restoration was a worktree setup step, not a code change.

## Known Stubs

None — entity and place links are wired to real enriched data from production lookups. No placeholder content.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes. Template renders build-time trusted data (T-11-05 and T-11-06 mitigated: entity codes are alphanumeric, display_name in href uses safeSlug filter, Nunjucks auto-escapes all `{{ }}` expressions).

## Self-Check: PASSED

- src/description.njk: FOUND and modified
- Commit 9c4242e: FOUND
- `{% for ent in desc._entity_links %}`: present
- `href="/entidad/{{ ent.code }}/"`: present
- `ent.role_labels | join(", ")`: present
- `<em class="text-stone-400">`: present
- `{% for place in desc._place_links %}`: present
- `href="/lugar/{{ place.display_name | safeSlug }}/"`: present
- `desc.creator_display`: absent (0 occurrences)
- `desc.place_display`: absent (0 occurrences)
- `class="text-burgundy` on entity/place links: absent
- Eleventy build: 310 pages, no errors
