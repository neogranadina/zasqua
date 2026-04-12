---
phase: 11-description-linking
plan: "01"
subsystem: data-pipeline
tags: [enrichment, entity-links, place-links, ui-roles, descriptions-loader]
dependency_graph:
  requires:
    - data/entity_links.json
    - data/entities.json
    - data/place_links.json
    - data/places.json
  provides:
    - data/desc-entity-lookup.json (enriched)
    - data/desc-place-lookup.json (enriched)
    - src/_data/descriptions.js (_entity_links, _place_links, _entity_codes, _place_codes)
    - src/_data/ui.js (29-role Spanish vocabulary)
  affects:
    - src/description.njk (Plan 02 will consume _entity_links and _place_links)
tech_stack:
  added: []
  patterns:
    - Enriched reverse-lookup generation in precompute-links.js (section 5)
    - Build-time role label resolution via ui.roles in data loader
key_files:
  created: []
  modified:
    - scripts/precompute-links.js
    - src/_data/ui.js
    - src/_data/descriptions.js
decisions:
  - "Integrated enrichment into existing precompute-links.js (section 5 rewrite) rather than a new script — avoids double-reading entity_links.json and entities.json (92K + 307K records)"
  - "Role label translation done in descriptions.js data loader (not in template or precompute script) — keeps Spanish strings centralised in ui.roles while avoiding Nunjucks filter complexity"
  - "Fallback for unresolved entity codes: display_name=code, entity_type='person' — consistent with research finding that 0 codes are currently missing"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-12"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 11 Plan 01: Enriched Entity/Place Lookup Data Foundation

Build-time enrichment pipeline producing `desc-entity-lookup.json` and `desc-place-lookup.json` with display names and roles, plus a complete 29-role Spanish vocabulary in `ui.roles` and an updated Eleventy data loader that attaches enriched objects to each description.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend precompute-links.js section 5 + extend ui.roles | 1504ac4 | scripts/precompute-links.js, src/_data/ui.js |
| 2 | Update descriptions.js data loader to attach enriched objects | 8b065db | src/_data/descriptions.js |

## What Was Built

### Task 1: Enriched reverse lookups + full role vocabulary

**scripts/precompute-links.js** — Section 5 rewritten from plain code-set reverse lookups to enriched object lookups:

- Entity lookup: joins `entity_links.json` (307,831 records) with `entities.json` (92,042 records) via `entity_code`. Deduplicates per description, collects roles into array. Output: `{code, display_name, entity_type, roles[]}` per entity per description. 88,273 description keys.
- Place lookup: joins `place_links.json` (191,703 records) with `places.json` (7,068 records) via `String(place_code) === String(place.id)`. Output: `{id, display_name}` per place per description. 83,724 description keys.
- Variable name `entityByCode` avoids collision with existing `byEntity` Map from section 1.

**src/_data/ui.js** — `roles` object extended from 5 to 29 entries. Added 24 colonial archival roles with Colombian Spanish labels (Remitente, Destinatario, Demandado, Demandante, Testigo, Funcionario, Escribano, Notario, Juez, Autor, Comprador, Vendedor, Fiador, Solicitante, Apelante, Albacea, Tutor, Apoderado, Intérprete, Tasador, Arrendatario, Arrendador, Deudor, Acreedor). The 5 existing keys are unchanged.

### Task 2: Enriched data loader

**src/_data/descriptions.js** — Updated to:

1. Load `ui.js` roles vocabulary (`const ui = require('./ui.js')`)
2. Attach `_entity_links` — array of enriched entity objects with `role_labels` (Spanish translations via `ui.roles`, unknown roles silently omitted per research anti-pattern note)
3. Attach `_place_links` — array of enriched place objects `{id, display_name}`
4. Derive `_entity_codes` and `_place_codes` as string arrays from enriched objects — preserves Pagefind `data-pagefind-filter` compatibility (Pitfall 1 from research)

## Verification

```
node scripts/precompute-links.js (DATA_DIR=production data)
→ Wrote enriched desc-entity-lookup.json with 88273 keys
→ Wrote enriched desc-place-lookup.json with 83724 keys
→ Exit 0

node -e "require('./src/_data/descriptions.js')()" (DATA_DIR=production data)
→ entity_link keys: code,display_name,entity_type,roles,role_labels
→ has display_name: true
→ has role_labels: true
→ _entity_codes type: string
→ place_link keys: id,display_name
→ _place_codes type: string
→ OK
```

## Deviations from Plan

None — plan executed exactly as written. The section 5 replacement in precompute-links.js matched the pseudocode in the plan verbatim. The `entityByCode` variable name specified in the plan correctly avoids collision with the existing `byEntity` Map.

## Known Stubs

None — no placeholder data. All enriched objects contain real display names and roles from production data files.

## Threat Flags

None — no new network endpoints, auth paths, file access patterns, or schema changes at trust boundaries. All files are build-time generated from trusted same-origin backend exports (T-11-01 through T-11-04 accepted as per plan threat model).

## Self-Check: PASSED

- scripts/precompute-links.js: FOUND (modified, verified runs)
- src/_data/ui.js: FOUND (29 roles confirmed)
- src/_data/descriptions.js: FOUND (enriched attachment confirmed)
- Commit 1504ac4: FOUND
- Commit 8b065db: FOUND
- data/desc-entity-lookup.json: contains {code, display_name, entity_type, roles} per entry — VERIFIED
- data/desc-place-lookup.json: contains {id, display_name} per entry — VERIFIED
